import { toArray } from './parser-helpers.js';
import { asNode, attr, firstAttr, type RawXmlNode } from './raw-xml.js';

/**
 * Extrae tipos de atributos definidos en la extension de Enterprise Architect
 * (<elements><element xmi:idref="..."><properties type="..."/>).
 */
export function readEaPropertyTypes(root: RawXmlNode, modelNode: RawXmlNode): Map<string, string> {
  const propertyTypes = new Map<string, string>();
  const extensions = toArray(root['xmi:Extension'] ?? modelNode['xmi:Extension']) as RawXmlNode[];

  for (const extension of extensions) {
    const elementsNode = asNode(extension['elements']);
    if (elementsNode !== null) {
      for (const el of toArray(elementsNode['element']) as RawXmlNode[]) {
        const idRef = firstAttr(el, 'xmi:idref', 'idref');
        const properties = asNode(el['properties']);
        if (idRef !== undefined && properties !== null) {
          const propType = attr(properties, 'type');
          if (propType !== undefined && propType.trim() !== '') {
            propertyTypes.set(idRef, propType.trim());
          }
        }

        const attributesNode = asNode(el['attributes']);
        if (attributesNode !== null) {
          for (const attrEl of toArray(attributesNode['attribute']) as RawXmlNode[]) {
            const attrId = firstAttr(attrEl, 'xmi:idref', 'idref');
            const attrName = attr(attrEl, 'name');
            const attrProps = asNode(attrEl['properties']);
            const propType = attrProps ? attr(attrProps, 'type') : undefined;
            if (propType !== undefined && propType.trim() !== '') {
              if (attrId) propertyTypes.set(attrId, propType.trim());
              if (attrName) propertyTypes.set(attrName, propType.trim());
            }
          }
        }
      }
    }
  }

  return propertyTypes;
}

/**
 * Aplana la jerarquia de paquetes y devuelve todos los elementos empaquetados
 * del documento, sin importar a que profundidad esten.
 */
export function flattenElements(node: RawXmlNode): RawXmlNode[] {
  const children = toArray(node['packagedElement'] ?? node['ownedElement']) as RawXmlNode[];
  const flattened: RawXmlNode[] = [];

  for (const child of children) {
    if (isContainer(firstAttr(child, 'xmi:type', 'type') ?? '')) {
      flattened.push(...flattenElements(child));
      continue;
    }
    flattened.push(child);
  }

  return flattened;
}

/** Paquetes y modelos anidados: contienen elementos, no son elementos del modelo. */
export function isContainer(kind: string): boolean {
  return kind === 'uml:Package' || kind === 'Package' || kind === 'uml:Model' || kind === 'Model';
}

/**
 * Identidad del modelo. Enterprise Architect envuelve todo en un `uml:Model`
 * generico (`EA_Model`) con un unico paquete dentro: el nombre que puso la
 * persona es el del paquete, no el del modelo.
 */
export function modelIdentity(modelNode: RawXmlNode): {
  rawId: string | undefined;
  name: string | undefined;
} {
  const children = toArray(modelNode['packagedElement']) as RawXmlNode[];
  const [onlyChild] = children;
  if (children.length === 1 && onlyChild !== undefined) {
    const kind = firstAttr(onlyChild, 'xmi:type', 'type') ?? '';
    if (kind === 'uml:Package' || kind === 'Package') {
      return { rawId: attr(onlyChild, 'xmi:id'), name: attr(onlyChild, 'name') };
    }
  }
  return { rawId: attr(modelNode, 'xmi:id'), name: attr(modelNode, 'name') };
}

/** Elementos que el importador traduce al metamodelo. */
export function isModelElement(kind: string): boolean {
  return (
    isClassifier(kind) ||
    isEnumeration(kind) ||
    kind === 'uml:Association' ||
    kind === 'Association' ||
    dependencyKindOf(kind) !== null
  );
}

export function isEnumeration(kind: string): boolean {
  return kind === 'uml:Enumeration' || kind === 'Enumeration';
}

/** Dependencias sueltas y realizaciones que no nacen dentro de la clase. */
export function dependencyKindOf(kind: string): 'dependency' | 'realization' | null {
  const bare = kind.replace(/^uml:/u, '');
  if (bare === 'Dependency' || bare === 'Usage') return 'dependency';
  if (bare === 'Realization' || bare === 'Abstraction') return 'realization';
  return null;
}

/** Indica si el elemento empaquetado es una clase o una interfaz. */
export function isClassifier(kind: string): boolean {
  return (
    kind === 'uml:Class' || kind === 'uml:Interface' || kind === 'Class' || kind === 'Interface'
  );
}
