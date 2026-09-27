import { ok, type Result, type UMLModel } from '@uml-forge/uml-core';
import { createEaContext } from './ea-context.js';
import { eaId } from './ea-ids.js';
import { eaConnectorsLines } from './ea-extension-connectors.js';
import { eaDiagramLines } from './ea-extension-diagram.js';
import { eaElementsLines } from './ea-extension-elements.js';
import type { XmiError } from './errors.js';
import { associationLines } from './serializer-associations.js';
import {
  classifierLines,
  enumerationLines,
  type InheritanceIndex,
  type InheritanceLink,
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

/**
 * Exporta un modelo UML a XMI 2.1 en el dialecto de Enterprise Architect
 * (ADR 0033). La estructura imita la de un fichero exportado por la propia
 * herramienta: un paquete raiz con los elementos, y una extension con los
 * datos propios de la herramienta y el diagrama de clases ya dibujado.
 */
export function exportXmi(
  model: UMLModel,
  options?: Partial<XmiExportOptions>,
): Result<string, XmiError> {
  const exporter = options?.exporter || 'UML Forge';
  const exporterVersion = options?.exporterVersion || '1.0.0';
  const types = new TypeResolver(model);
  const context = createEaContext(model, types, exporter);
  const inheritance = indexInheritance(model);
  const indent = '      ';

  const body: string[] = [];
  for (const classifier of model.classes) {
    body.push(...classifierLines(classifier, types, inheritance, indent));
  }
  for (const enumeration of model.enums) {
    body.push(...enumerationLines(enumeration, indent));
  }
  for (const relationship of model.relationships) {
    if (relationship.kind === 'generalization' || relationship.kind === 'realization') {
      continue;
    }
    body.push(...associationLines(relationship, indent));
  }

  const name = escapeXml(model.name);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<xmi:XMI xmi:version="2.1" xmlns:uml="${UML_NAMESPACE}" xmlns:xmi="${XMI_NAMESPACE}">`,
    // Enterprise Architect solo lee su extension (y con ella los diagramas)
    // cuando el documento declara su propio dialecto.
    '  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>',
    `  <uml:Model xmi:type="uml:Model" name="${name}" visibility="public">`,
    `    <packagedElement xmi:type="uml:Package" xmi:id="${context.packageId}" name="${name}" visibility="public">`,
    ...body,
    '    </packagedElement>',
    '  </uml:Model>',
    '  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">',
    ...eaElementsLines(context, '    '),
    ...eaConnectorsLines(context, '    '),
    ...types.primitiveLines('    '),
    '    <profiles/>',
    ...eaDiagramLines(context, '    '),
    '  </xmi:Extension>',
    ...umlForgeExtensionLines(model, exporter, exporterVersion, options?.revision),
    '</xmi:XMI>',
  ];

  return ok(lines.join('\n'));
}

/** Agrupa por clase de origen la herencia y la realizacion de interfaces. */
function indexInheritance(model: UMLModel): InheritanceIndex {
  const generalizations = new Map<string, InheritanceLink[]>();
  const realizations = new Map<string, InheritanceLink[]>();

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
    list.push({ relationshipId: relationship.id, targetId: relationship.targetId });
    target.set(relationship.sourceId, list);
  }

  return { generalizations, realizations };
}

/**
 * Extension propia de UML Forge: las coordenadas exactas del lienzo (el
 * diagrama de Enterprise Architect las traslada al primer cuadrante) y la
 * revision del modelo que se exporto, que usa el control de versiones.
 */
function umlForgeExtensionLines(
  model: UMLModel,
  exporter: string,
  exporterVersion: string,
  revision: number | undefined,
): string[] {
  const lines = [
    `  <xmi:Extension extender="UMLForge" extenderID="${escapeXml(exporterVersion)}">`,
    `    <modelVersion exporter="${escapeXml(exporter)}" modelId="${model.id}" revision="${revision ?? 0}" updatedAt="${escapeXml(model.updatedAt)}"/>`,
    '    <diagramElements>',
  ];
  for (const element of [...model.classes, ...model.enums]) {
    lines.push(
      `      <element xmi:idref="${eaId(element.id)}" x="${element.position.x}" y="${element.position.y}"/>`,
    );
  }
  lines.push('    </diagramElements>', '  </xmi:Extension>');
  return lines;
}
