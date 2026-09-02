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
 * Las coordenadas del lienzo no forman parte del estandar, asi que viajan en
 * una extension propia. Las herramientas externas la ignoran sin protestar y
 * UML Forge recupera el diagrama tal cual estaba.
 */
function positionExtensionLines(model: UMLModel): string[] {
  const lines = ['  <xmi:Extension extender="UMLForge">', '    <diagramElements>'];

  for (const element of [...model.classes, ...model.enums]) {
    lines.push(
      `      <element xmi:idref="${element.id}" x="${element.position.x}" y="${element.position.y}"/>`,
    );
  }

  lines.push('    </diagramElements>', '  </xmi:Extension>');
  return lines;
}
