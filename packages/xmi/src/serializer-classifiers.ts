import type { UMLClass, UMLEnum, UMLOperation, UMLProperty } from '@uml-forge/uml-core';
import type { TypeResolver } from './serializer-types.js';
import { escapeXml, multiplicityLines, toXmlId } from './xml-text.js';

/** Herencia y realizacion que nacen dentro del clasificador de origen. */
export interface InheritanceIndex {
  readonly generalizations: ReadonlyMap<string, string[]>;
  readonly realizations: ReadonlyMap<string, string[]>;
}

/** Escribe una clase o interfaz con sus atributos, operaciones y herencia. */
export function classifierLines(
  classifier: UMLClass,
  types: TypeResolver,
  inheritance: InheritanceIndex,
): string[] {
  const tag = classifier.isInterface ? 'uml:Interface' : 'uml:Class';
  const abstractAttr = classifier.isAbstract && !classifier.isInterface ? ' isAbstract="true"' : '';

  const lines = [
    `    <packagedElement xmi:type="${tag}" xmi:id="${classifier.id}" name="${escapeXml(classifier.name)}"${abstractAttr}>`,
  ];

  for (const attribute of classifier.attributes) {
    lines.push(...attributeLines(attribute, types));
  }
  for (const operation of classifier.operations) {
    lines.push(...operationLines(operation, types));
  }

  for (const generalId of inheritance.generalizations.get(classifier.id) ?? []) {
    lines.push(
      `      <generalization xmi:type="uml:Generalization" xmi:id="${classifier.id}-gen-${generalId}" general="${generalId}"/>`,
    );
  }

  for (const contractId of inheritance.realizations.get(classifier.id) ?? []) {
    const id = `${classifier.id}-real-${contractId}`;
    lines.push(
      `      <interfaceRealization xmi:type="uml:InterfaceRealization" xmi:id="${id}" client="${classifier.id}" supplier="${contractId}" contract="${contractId}"/>`,
    );
  }

  lines.push('    </packagedElement>');
  return lines;
}

/** Escribe un `ownedAttribute` con su tipo referenciado y su cardinalidad exacta. */
function attributeLines(attribute: UMLProperty, types: TypeResolver): string[] {
  const flags = [
    attribute.isStatic ? ' isStatic="true"' : '',
    attribute.isUnique ? ' isUnique="true"' : '',
    attribute.isDerived ? ' isDerived="true"' : '',
  ].join('');

  const lines = [
    `      <ownedAttribute xmi:type="uml:Property" xmi:id="${attribute.id}" name="${escapeXml(attribute.name)}" visibility="${attribute.visibility}" type="${types.referenceFor(attribute.type)}"${flags}>`,
  ];

  if (attribute.defaultValue) {
    lines.push(
      `        <defaultValue xmi:type="uml:LiteralString" value="${escapeXml(attribute.defaultValue)}"/>`,
    );
  }
  lines.push(...multiplicityLines(attribute.multiplicity, '        '));
  lines.push('      </ownedAttribute>');
  return lines;
}

/** Escribe un `ownedOperation`; el tipo de retorno viaja como parametro `return`. */
function operationLines(operation: UMLOperation, types: TypeResolver): string[] {
  const flags = [
    operation.isAbstract ? ' isAbstract="true"' : '',
    operation.isStatic ? ' isStatic="true"' : '',
  ].join('');

  const lines = [
    `      <ownedOperation xmi:type="uml:Operation" xmi:id="${operation.id}" name="${escapeXml(operation.name)}" visibility="${operation.visibility}"${flags}>`,
  ];

  if (operation.returnType) {
    lines.push(
      `        <ownedParameter xmi:type="uml:Parameter" xmi:id="${operation.id}-return" name="return" direction="return" type="${types.referenceFor(operation.returnType)}"/>`,
    );
  }
  for (const parameter of operation.parameters) {
    lines.push(
      `        <ownedParameter xmi:type="uml:Parameter" xmi:id="${parameter.id}" name="${escapeXml(parameter.name)}" direction="${parameter.direction}" type="${types.referenceFor(parameter.type)}"/>`,
    );
  }

  lines.push('      </ownedOperation>');
  return lines;
}

/** Escribe una enumeracion con sus literales. */
export function enumerationLines(enumeration: UMLEnum): string[] {
  const lines = [
    `    <packagedElement xmi:type="uml:Enumeration" xmi:id="${enumeration.id}" name="${escapeXml(enumeration.name)}">`,
  ];

  for (const literal of enumeration.literals) {
    lines.push(
      `      <ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="${enumeration.id}-lit-${toXmlId(literal)}" name="${escapeXml(literal)}"/>`,
    );
  }

  lines.push('    </packagedElement>');
  return lines;
}
