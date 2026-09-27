import type { UMLModel } from '@uml-forge/uml-core';
import { eaId } from './ea-ids.js';
import { escapeXml, toXmlId } from './xml-text.js';

/**
 * Resuelve las referencias de tipo. En XMI el atributo `type` de una propiedad
 * es siempre una referencia a otro elemento, nunca el nombre del tipo: escribir
 * `type="String"` hace que Enterprise Architect importe el atributo sin tipo.
 *
 * Los tipos del propio modelo se referencian por su `EAID_`. Los primitivos se
 * referencian como `EAJava_<Nombre>`, que es exactamente lo que escribe
 * Enterprise Architect para una clase Java, y se declaran en la seccion
 * `primitivetypes` de su extension: asi no aparecen como elementos sueltos en
 * el navegador del proyecto al importar.
 */
export class TypeResolver {
  private readonly modelTypes = new Map<string, { id: string; name: string }>();
  private readonly primitives = new Map<string, string>();

  constructor(model: UMLModel) {
    for (const classifier of [...model.classes, ...model.enums]) {
      const entry = { id: eaId(classifier.id), name: classifier.name };
      this.modelTypes.set(classifier.id, entry);
      this.modelTypes.set(classifier.name, entry);
    }
  }

  /** Identificador al que apunta el atributo `type`, registrando el primitivo si hace falta. */
  referenceFor(typeName: string): string {
    const existing = this.modelTypes.get(typeName);
    if (existing !== undefined) {
      return existing.id;
    }

    const primitiveId = this.primitives.get(typeName) ?? `EAJava_${toXmlId(typeName)}`;
    this.primitives.set(typeName, primitiveId);
    return primitiveId;
  }

  /** Nombre legible del tipo, el que Enterprise Architect muestra en el diagrama. */
  displayName(typeName: string): string {
    return this.modelTypes.get(typeName)?.name ?? typeName;
  }

  /** Identificador `EAID_` del clasificador del modelo, o null si es un primitivo. */
  classifierFor(typeName: string): string | null {
    return this.modelTypes.get(typeName)?.id ?? null;
  }

  /** Seccion `primitivetypes` de la extension con los primitivos que se usaron. */
  primitiveLines(indent: string): string[] {
    if (this.primitives.size === 0) {
      return [`${indent}<primitivetypes/>`];
    }
    const inner = `${indent}    `;
    return [
      `${indent}<primitivetypes>`,
      `${indent}  <packagedElement xmi:type="uml:Package" xmi:id="EAPrimitiveTypesPackage" name="EA_PrimitiveTypes_Package" visibility="public">`,
      `${indent}    <packagedElement xmi:type="uml:Package" xmi:id="EAJavaTypesPackage" name="EA_Java_Types_Package" visibility="public">`,
      ...[...this.primitives.entries()].map(
        ([name, id]) =>
          `${inner}  <packagedElement xmi:type="uml:PrimitiveType" xmi:id="${id}" name="${escapeXml(name)}" visibility="public"/>`,
      ),
      `${indent}    </packagedElement>`,
      `${indent}  </packagedElement>`,
      `${indent}</primitivetypes>`,
    ];
  }
}
