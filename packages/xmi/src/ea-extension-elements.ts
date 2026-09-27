import type { UMLClass, UMLOperation, UMLProperty } from '@uml-forge/uml-core';
import { eaElementType, eaScope, type Classifier, type EaExportContext } from './ea-context.js';
import { eaGuid, eaId } from './ea-ids.js';
import { escapeXml, multiplicityBounds } from './xml-text.js';

/** Apariencia por defecto que escribe Enterprise Architect en cada elemento. */
const DEFAULT_APPEARANCE =
  'BackColor=-1;BorderColor=-1;BorderWidth=-1;FontColor=-1;VSwimLanes=1;HSwimLanes=1;BorderStyle=0;';

/**
 * Seccion `elements` de la extension: el paquete y cada clasificador, con los
 * datos propios de la herramienta (paquete contenedor, `ea_localid`, lenguaje
 * Java y el tipo legible de atributos y operaciones).
 */
export function eaElementsLines(context: EaExportContext, indent: string): string[] {
  const inner = `${indent}  `;
  const lines = [`${indent}<elements>`, ...packageElementLines(context, inner)];

  for (const classifier of [...context.model.classes, ...context.model.enums]) {
    lines.push(...classifierElementLines(context, classifier, inner));
  }

  lines.push(`${indent}</elements>`);
  return lines;
}

function packageElementLines(context: EaExportContext, indent: string): string[] {
  const name = escapeXml(context.model.name);
  return [
    `${indent}<element xmi:idref="${context.packageId}" xmi:type="uml:Package" name="${name}" scope="public">`,
    `${indent}  <model package2="${context.packageElementId}" package="${context.parentPackageId}" tpos="0" ea_localid="1" ea_eleType="package"/>`,
    `${indent}  <properties isSpecification="false" sType="Package" nType="0" scope="public"/>`,
    projectLine(context, `${indent}  `),
    `${indent}  <code gentype="Java"/>`,
    `${indent}  <style appearance="${DEFAULT_APPEARANCE}"/>`,
    `${indent}  <packageproperties version="1.0" tpos="0"/>`,
    `${indent}</element>`,
  ];
}

function classifierElementLines(
  context: EaExportContext,
  classifier: Classifier,
  indent: string,
): string[] {
  const sType = eaElementType(classifier);
  const isAbstract = 'isAbstract' in classifier && classifier.isAbstract;
  const inner = `${indent}  `;

  const lines = [
    `${indent}<element xmi:idref="${eaId(classifier.id)}" xmi:type="uml:${sType}" name="${escapeXml(classifier.name)}" scope="public">`,
    `${inner}<model package="${context.packageId}" tpos="0" ea_localid="${context.localIds.get(classifier.id) ?? 0}" ea_eleType="element"/>`,
    `${inner}<properties isSpecification="false" sType="${sType}" nType="0" scope="public" isRoot="false" isLeaf="false" isAbstract="${String(isAbstract)}" isActive="false"/>`,
    projectLine(context, inner),
    `${inner}<code gentype="Java"/>`,
    `${inner}<style appearance="${DEFAULT_APPEARANCE}"/>`,
    `${inner}<extendedProperties tagged="0" package_name="${escapeXml(context.model.name)}"/>`,
  ];

  if (!('literals' in classifier)) {
    lines.push(...attributesLines(context, classifier, inner));
    lines.push(...operationsLines(context, classifier, inner));
  }

  lines.push(`${indent}</element>`);
  return lines;
}

function projectLine(context: EaExportContext, indent: string): string {
  return `${indent}<project author="${escapeXml(context.author)}" version="1.0" phase="1.0" created="${context.created}" modified="${context.modified}" complexity="1" status="Proposed"/>`;
}

function attributesLines(context: EaExportContext, owner: UMLClass, indent: string): string[] {
  if (owner.attributes.length === 0) {
    return [];
  }
  const lines = [`${indent}<attributes>`];
  owner.attributes.forEach((attribute, position) => {
    lines.push(...attributeLines(context, attribute, position, `${indent}  `));
  });
  lines.push(`${indent}</attributes>`);
  return lines;
}

function attributeLines(
  context: EaExportContext,
  attribute: UMLProperty,
  position: number,
  indent: string,
): string[] {
  const { lower, upper } = multiplicityBounds(attribute.multiplicity);
  const initial = attribute.defaultValue ? ` body="${escapeXml(attribute.defaultValue)}"` : '';
  const classifier = context.types.classifierFor(attribute.type);
  const classifierAttr = classifier === null ? '' : ` classifier="${classifier}"`;

  return [
    `${indent}<attribute xmi:idref="${eaId(attribute.id)}" name="${escapeXml(attribute.name)}" scope="${eaScope(attribute.visibility)}">`,
    `${indent}  <initial${initial}/>`,
    `${indent}  <model ea_guid="${eaGuid(attribute.id)}"/>`,
    `${indent}  <properties type="${escapeXml(context.types.displayName(attribute.type))}"${classifierAttr} derived="${attribute.isDerived ? 1 : 0}" static="${attribute.isStatic ? 1 : 0}" collection="${upper === '1' ? 'false' : 'true'}" duplicates="${attribute.isUnique ? 0 : 1}" changeability="changeable"/>`,
    `${indent}  <containment containment="Not Specified" position="${position}"/>`,
    `${indent}  <bounds lower="${lower}" upper="${upper}"/>`,
    `${indent}</attribute>`,
  ];
}

function operationsLines(context: EaExportContext, owner: UMLClass, indent: string): string[] {
  if (owner.operations.length === 0) {
    return [];
  }
  const lines = [`${indent}<operations>`];
  owner.operations.forEach((operation, position) => {
    lines.push(...operationLines(context, operation, position, `${indent}  `));
  });
  lines.push(`${indent}</operations>`);
  return lines;
}

function operationLines(
  context: EaExportContext,
  operation: UMLOperation,
  position: number,
  indent: string,
): string[] {
  const returnType = operation.returnType
    ? escapeXml(context.types.displayName(operation.returnType))
    : 'void';
  const inner = `${indent}  `;

  const lines = [
    `${indent}<operation xmi:idref="${eaId(operation.id)}" name="${escapeXml(operation.name)}" scope="${eaScope(operation.visibility)}">`,
    `${inner}<properties position="${position}"/>`,
    `${inner}<model ea_guid="${eaGuid(operation.id)}"/>`,
    `${inner}<type type="${returnType}" const="false" static="${String(operation.isStatic)}" isAbstract="${String(operation.isAbstract)}" synchronised="0" concurrency="Sequential" pure="0" isQuery="false"/>`,
  ];

  if (operation.parameters.length > 0) {
    lines.push(`${inner}<parameters>`);
    operation.parameters.forEach((parameter, index) => {
      lines.push(
        `${inner}  <parameter xmi:idref="${eaId(parameter.id)}" visibility="public">`,
        `${inner}    <properties pos="${index}" type="${escapeXml(context.types.displayName(parameter.type))}" const="false" kind="${parameter.direction}" ea_guid="${eaGuid(parameter.id)}"/>`,
        `${inner}  </parameter>`,
      );
    });
    lines.push(`${inner}</parameters>`);
  }

  lines.push(`${indent}</operation>`);
  return lines;
}
