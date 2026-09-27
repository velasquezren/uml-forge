import type { UMLClass, UMLEnum, UMLOperation, UMLProperty } from '@uml-forge/uml-core';
import { eaId } from './ea-ids.js';
import type { TypeResolver } from './serializer-types.js';
import { escapeXml, multiplicityLines } from './xml-text.js';

/** Relacion de herencia o realizacion vista desde la clase que la declara. */
export interface InheritanceLink {
  readonly relationshipId: string;
  readonly targetId: string;
}

/** Herencia y realizacion que nacen dentro del clasificador de origen. */
export interface InheritanceIndex {
  readonly generalizations: ReadonlyMap<string, InheritanceLink[]>;
  readonly realizations: ReadonlyMap<string, InheritanceLink[]>;
}

/** Escribe una clase o interfaz con sus atributos, operaciones y herencia. */
export function classifierLines(
  classifier: UMLClass,
  types: TypeResolver,
  inheritance: InheritanceIndex,
  indent: string,
): string[] {
  const tag = classifier.isInterface ? 'uml:Interface' : 'uml:Class';
  const abstractAttr = classifier.isAbstract && !classifier.isInterface ? ' isAbstract="true"' : '';
  const id = eaId(classifier.id);
  const inner = `${indent}  `;

  const lines = [
    `${indent}<packagedElement xmi:type="${tag}" xmi:id="${id}" name="${escapeXml(classifier.name)}" visibility="public"${abstractAttr}>`,
  ];

  for (const attribute of classifier.attributes) {
    lines.push(...attributeLines(attribute, types, inner));
  }
  for (const operation of classifier.operations) {
    lines.push(...operationLines(operation, types, inner));
  }

  for (const link of inheritance.generalizations.get(classifier.id) ?? []) {
    lines.push(
      `${inner}<generalization xmi:type="uml:Generalization" xmi:id="${eaId(link.relationshipId)}" general="${eaId(link.targetId)}"/>`,
    );
  }

  for (const link of inheritance.realizations.get(classifier.id) ?? []) {
    const contract = eaId(link.targetId);
    lines.push(
      `${inner}<interfaceRealization xmi:type="uml:InterfaceRealization" xmi:id="${eaId(link.relationshipId)}" client="${id}" supplier="${contract}" contract="${contract}"/>`,
    );
  }

  lines.push(`${indent}</packagedElement>`);
  return lines;
}

/** Escribe un `ownedAttribute` con su tipo referenciado y su cardinalidad exacta. */
function attributeLines(attribute: UMLProperty, types: TypeResolver, indent: string): string[] {
  const flags = [
    ` isStatic="${String(attribute.isStatic)}"`,
    ` isUnique="${String(attribute.isUnique)}"`,
    ` isDerived="${String(attribute.isDerived)}"`,
  ].join('');
  const id = eaId(attribute.id);

  const lines = [
    `${indent}<ownedAttribute xmi:type="uml:Property" xmi:id="${id}" name="${escapeXml(attribute.name)}" visibility="${attribute.visibility}" type="${types.referenceFor(attribute.type)}"${flags}>`,
  ];

  if (attribute.defaultValue) {
    lines.push(
      `${indent}  <defaultValue xmi:type="uml:LiteralString" xmi:id="${eaId(`${attribute.id}-default`)}" value="${escapeXml(attribute.defaultValue)}"/>`,
    );
  }
  lines.push(...multiplicityLines(attribute.multiplicity, `${indent}  `, attribute.id));
  lines.push(`${indent}</ownedAttribute>`);
  return lines;
}

/** Escribe un `ownedOperation`; el tipo de retorno viaja como parametro `return`. */
function operationLines(operation: UMLOperation, types: TypeResolver, indent: string): string[] {
  const flags = [
    operation.isAbstract ? ' isAbstract="true"' : '',
    operation.isStatic ? ' isStatic="true"' : '',
  ].join('');

  const lines = [
    `${indent}<ownedOperation xmi:type="uml:Operation" xmi:id="${eaId(operation.id)}" name="${escapeXml(operation.name)}" visibility="${operation.visibility}"${flags}>`,
  ];

  if (operation.returnType) {
    lines.push(
      `${indent}  <ownedParameter xmi:type="uml:Parameter" xmi:id="${eaId(`${operation.id}-return`)}" name="return" direction="return" type="${types.referenceFor(operation.returnType)}"/>`,
    );
  }
  for (const parameter of operation.parameters) {
    lines.push(
      `${indent}  <ownedParameter xmi:type="uml:Parameter" xmi:id="${eaId(parameter.id)}" name="${escapeXml(parameter.name)}" direction="${parameter.direction}" type="${types.referenceFor(parameter.type)}"/>`,
    );
  }

  lines.push(`${indent}</ownedOperation>`);
  return lines;
}

/** Escribe una enumeracion con sus literales. */
export function enumerationLines(enumeration: UMLEnum, indent: string): string[] {
  const lines = [
    `${indent}<packagedElement xmi:type="uml:Enumeration" xmi:id="${eaId(enumeration.id)}" name="${escapeXml(enumeration.name)}" visibility="public">`,
  ];

  for (const literal of enumeration.literals) {
    lines.push(
      `${indent}  <ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="${eaId(`${enumeration.id}-lit-${literal}`)}" name="${escapeXml(literal)}"/>`,
    );
  }

  lines.push(`${indent}</packagedElement>`);
  return lines;
}
