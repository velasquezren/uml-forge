import type { UMLModel } from '@uml-forge/uml-core';
import { escapeXml, toXmlId } from './xml-text.js';

/**
 * Resuelve las referencias de tipo. En XMI el atributo `type` de una propiedad
 * es siempre una referencia a otro elemento, nunca el nombre del tipo: escribir
 * `type="String"` hace que Enterprise Architect importe el atributo sin tipo.
 * Por eso los tipos primitivos se declaran como `uml:PrimitiveType`.
 */
export class TypeResolver {
  private readonly modelTypes = new Map<string, string>();
  private readonly primitives = new Map<string, string>();

  constructor(model: UMLModel) {
    for (const classifier of model.classes) {
      this.modelTypes.set(classifier.id, classifier.id);
      this.modelTypes.set(classifier.name, classifier.id);
    }
    for (const enumeration of model.enums) {
      this.modelTypes.set(enumeration.id, enumeration.id);
      this.modelTypes.set(enumeration.name, enumeration.id);
    }
  }

  /** Identificador al que apunta el atributo `type`, declarando el primitivo si hace falta. */
  referenceFor(typeName: string): string {
    const existing = this.modelTypes.get(typeName);
    if (existing !== undefined) {
      return existing;
    }

    const primitiveId = this.primitives.get(typeName) ?? `umlforge-primitive-${toXmlId(typeName)}`;
    this.primitives.set(typeName, primitiveId);
    return primitiveId;
  }

  /** Declaraciones de los tipos primitivos usados, para que las referencias resuelvan. */
  primitiveLines(indent: string): string[] {
    return [...this.primitives.entries()].map(
      ([name, id]) =>
        `${indent}<packagedElement xmi:type="uml:PrimitiveType" xmi:id="${id}" name="${escapeXml(name)}"/>`,
    );
  }
}
