import { ok, type Result, type UMLModel } from '@uml-forge/uml-core';
import type { XmiError } from './errors.js';
import { associationLines } from './serializer-associations.js';
import {
  classifierLines,
  enumerationLines,
  type InheritanceIndex,
} from './serializer-classifiers.js';
import { TypeResolver } from './serializer-types.js';
import type { XmiExportOptions } from './types.js';
import { escapeXml } from './xml-text.js';

/**
 * Espacios de nombres de la OMG para XMI 2.1. Enterprise Architect decide como
 * leer el documento a partir de ellos: con el espacio de nombres de Eclipse
 * UML2 rechaza el fichero o lo importa vacio.
 */
const XMI_NAMESPACE = 'http://schema.omg.org/spec/XMI/2.1';
const UML_NAMESPACE = 'http://schema.omg.org/spec/UML/2.1';

/** Exporta un modelo UML a XMI 2.1 legible por Enterprise Architect. */
export function exportXmi(
  model: UMLModel,
  options?: Partial<XmiExportOptions>,
): Result<string, XmiError> {
  const exporter = options?.exporter || 'UML Forge';
  const exporterVersion = options?.exporterVersion || '1.0.0';
  const types = new TypeResolver(model);
  const inheritance = indexInheritance(model);

  const body: string[] = [];

  for (const classifier of model.classes) {
    body.push(...classifierLines(classifier, types, inheritance));
  }
  for (const enumeration of model.enums) {
    body.push(...enumerationLines(enumeration));
  }
  for (const relationship of model.relationships) {
    if (relationship.kind === 'generalization' || relationship.kind === 'realization') {
      continue;
    }
    body.push(...associationLines(relationship));
  }

  // Los primitivos se declaran al final, cuando ya se sabe cuales se usaron.
  body.push(...types.primitiveLines('    '));

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<xmi:XMI xmi:version="2.1" xmlns:xmi="${XMI_NAMESPACE}" xmlns:uml="${UML_NAMESPACE}">`,
    `  <xmi:Documentation exporter="${escapeXml(exporter)}" exporterVersion="${escapeXml(exporterVersion)}"/>`,
    `  <uml:Model xmi:type="uml:Model" xmi:id="${model.id}" name="${escapeXml(model.name)}">`,
    ...body,
    '  </uml:Model>',
    ...positionExtensionLines(model),
    '</xmi:XMI>',
  ];

  return ok(lines.join('\n'));
}

/** Agrupa por clase de origen la herencia y la realizacion de interfaces. */
function indexInheritance(model: UMLModel): InheritanceIndex {
  const generalizations = new Map<string, string[]>();
  const realizations = new Map<string, string[]>();

  for (const relationship of model.relationships) {
    const target =
      relationship.kind === 'generalization'
        ? generalizations
        : relationship.kind === 'realization'
          ? realizations
          : null;
    if (target === null) {
      continue;
    }
    const list = target.get(relationship.sourceId) ?? [];
    list.push(relationship.targetId);
    target.set(relationship.sourceId, list);
  }

  return { generalizations, realizations };
}

/**
 * Exporta las coordenadas del lienzo tanto en el formato nativo de Enterprise Architect
 * (<diagrams><diagram><elements>) como en la extension propia de UMLForge (<diagramElements>).
 * De este modo, al importar en Enterprise Architect 15/16/17 se crea automaticamente
 * el diagrama de clases con todos los clasificadores ya posicionados.
 */
function positionExtensionLines(model: UMLModel): string[] {
  const allElements = [...model.classes, ...model.enums];
  const cleanModelId = model.id.replace(/-/g, '_');
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const lines: string[] = [
    '  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">',
    '    <elements>',
  ];

  // Elementos para Enterprise Architect
  let localId = 1;
  for (const cls of model.classes) {
    const isAbs = cls.isAbstract ? 'true' : 'false';
    const isInterface = cls.isInterface ? 'true' : 'false';
    const sType = cls.isInterface ? 'Interface' : 'Class';
    lines.push(
      `      <element xmi:idref="${cls.id}" xmi:type="uml:${sType}" name="${escapeXml(cls.name)}" scope="public">`,
      `        <model package="${model.id}" tType="${sType}" ea_localid="${localId++}"/>`,
      `        <properties sType="${sType}" isAbstract="${isAbs}" isSpecification="${isInterface}"/>`,
      '      </element>',
    );
  }

  for (const enm of model.enums) {
    lines.push(
      `      <element xmi:idref="${enm.id}" xmi:type="uml:Enumeration" name="${escapeXml(enm.name)}" scope="public">`,
      `        <model package="${model.id}" tType="Enumeration" ea_localid="${localId++}"/>`,
      '        <properties sType="Enumeration"/>',
      '      </element>',
    );
  }
  lines.push('    </elements>');

  // Diagrama de clases para Enterprise Architect (permite que EA abra directamente el diagrama con los nodos)
  lines.push(
    '    <diagrams>',
    `      <diagram xmi:id="EAID_DIAG_${cleanModelId}">`,
    `        <model package="${model.id}" localID="1" ea_localid="1"/>`,
    `        <properties name="${escapeXml(model.name)}" type="Logical"/>`,
    `        <project author="UML Forge" version="1.0" created="${nowStr}" modified="${nowStr}"/>`,
    '        <elements>',
  );

  allElements.forEach((item, index) => {
    const duid = item.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const left = Math.round(item.position.x);
    const top = Math.round(item.position.y);
    const right = left + 180;
    const bottom = top + 120;
    lines.push(
      `          <element subject="${item.id}" seqno="${index + 1}" style="DUID=${duid};" geometry="Left=${left};Top=${top};Right=${right};Bottom=${bottom};"/>`,
    );
  });

  lines.push('        </elements>', '      </diagram>', '    </diagrams>', '  </xmi:Extension>');

  // Extension propia UMLForge para compatibilidad de roundtrip
  lines.push('  <xmi:Extension extender="UMLForge">', '    <diagramElements>');
  for (const element of allElements) {
    lines.push(
      `      <element xmi:idref="${element.id}" x="${element.position.x}" y="${element.position.y}"/>`,
    );
  }
  lines.push('    </diagramElements>', '  </xmi:Extension>');

  return lines;
}
