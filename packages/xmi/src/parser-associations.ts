import type { UMLRelationship } from '@uml-forge/uml-core';
import { normalizeMultiplicity, toArray, type IdMapper } from './parser-helpers.js';
import { asNode, attr, childValue, firstAttr, type RawXmlNode } from './raw-xml.js';

/** Extremo de asociacion ya interpretado, venga de la asociacion o de una clase. */
export interface AssociationEnd {
  readonly endId?: string;
  /** Identificador original del clasificador al que se engancha el extremo. */
  readonly typeId?: string;
  /** Clase que posee el extremo, cuando viaja como `ownedAttribute` (estilo EA). */
  readonly ownerClassId?: string;
  readonly role: string;
  readonly multiplicity: string;
  readonly navigable: boolean;
  readonly aggregation: string;
}

const NEUTRAL_END: AssociationEnd = {
  role: '',
  multiplicity: '1',
  navigable: true,
  aggregation: 'none',
};

/** Extremos que las clases poseen, indexados por extremo y por asociacion. */
export interface ClassOwnedEnds {
  readonly byEndId: Map<string, AssociationEnd>;
  readonly byAssociation: Map<string, AssociationEnd[]>;
}

export function emptyClassOwnedEnds(): ClassOwnedEnds {
  return { byEndId: new Map(), byAssociation: new Map() };
}

/** Referencia de tipo, ya sea atributo `type` o hijo `<type xmi:idref>` como escribe EA. */
export function typeReference(node: RawXmlNode): string | undefined {
  const direct = attr(node, 'type');
  if (direct !== undefined && direct.trim() !== '') {
    return direct.trim();
  }
  const child = asNode(node['type']);
  if (child !== null) {
    const idRef = firstAttr(child, 'xmi:idref', 'idref', 'href', 'name', 'type', 'xmi:type');
    if (idRef !== undefined && idRef.trim() !== '') {
      return idRef.trim();
    }
  } else if (typeof node['type'] === 'string' && node['type'].trim() !== '') {
    return node['type'].trim();
  }
  return undefined;
}

/**
 * Registra los extremos que una clase posee. Enterprise Architect escribe el
 * extremo navegable como `ownedAttribute` de la clase con el atributo
 * `association`; sin recogerlo aqui la asociacion llegaria coja y ademas
 * apareceria un atributo fantasma en la clase.
 */
export function collectClassOwnedEnds(
  classElement: RawXmlNode,
  classRawId: string | undefined,
  target: ClassOwnedEnds,
): void {
  for (const node of toArray(classElement['ownedAttribute']) as RawXmlNode[]) {
    const associationId = attr(node, 'association');
    if (associationId === undefined) {
      continue;
    }

    const end: AssociationEnd = {
      endId: attr(node, 'xmi:id'),
      typeId: typeReference(node),
      ownerClassId: classRawId,
      role: firstAttr(node, 'name', 'role') ?? '',
      multiplicity: normalizeMultiplicity(
        childValue(node, 'lowerValue') ?? '1',
        childValue(node, 'upperValue') ?? '1',
      ),
      // Un extremo poseido por la clase es navegable por definicion en UML 2.
      navigable: true,
      aggregation: attr(node, 'aggregation') ?? 'none',
    };

    if (end.endId !== undefined) {
      target.byEndId.set(end.endId, end);
    }
    const list = target.byAssociation.get(associationId) ?? [];
    list.push(end);
    target.byAssociation.set(associationId, list);
  }
}

/** Traduce un `packagedElement` de tipo asociacion a una relacion del metamodelo. */
export function parseAssociation(
  element: RawXmlNode,
  associationId: string,
  associationRawId: string | undefined,
  name: string,
  idMapper: IdMapper,
  classOwned: ClassOwnedEnds,
): UMLRelationship | null {
  const ends = resolveEnds(element, associationRawId, classOwned);
  if (ends.length < 2) {
    return null;
  }

  const aggregations = ends.map((end) => end.aggregation);
  const kind = aggregations.includes('composite')
    ? 'composition'
    : aggregations.includes('shared')
      ? 'aggregation'
      : 'association';

  const { sourceRawId, targetRawId, sourceEnd, targetEnd } = orientEnds(ends);
  if (sourceRawId === undefined || targetRawId === undefined) {
    return null;
  }

  return {
    id: associationId,
    kind,
    name,
    sourceId: idMapper.toUuid(sourceRawId),
    targetId: idMapper.toUuid(targetRawId),
    sourceEnd: toModelEnd(sourceEnd),
    targetEnd: toModelEnd(targetEnd),
  };
}

/** Reune los extremos: los de la propia asociacion y los que posee una clase. */
function resolveEnds(
  element: RawXmlNode,
  associationRawId: string | undefined,
  classOwned: ClassOwnedEnds,
): AssociationEnd[] {
  // En UML 2 `navigableOwnedEnd` es una referencia a un `ownedEnd`; versiones
  // antiguas de UML Forge lo escribian como contenedor del extremo.
  const navigableNodes = toArray(element['navigableOwnedEnd']) as RawXmlNode[];
  const navigableRefs = new Set(
    navigableNodes
      .filter((node) => attr(node, 'xmi:id') === undefined)
      .map((node) => firstAttr(node, 'xmi:idref', 'idref'))
      .filter((ref): ref is string => ref !== undefined),
  );
  const navigability: Navigability = { refs: navigableRefs, declared: navigableNodes.length > 0 };

  const owned = [
    ...(toArray(element['ownedEnd']) as RawXmlNode[]).map((node) =>
      readOwnedEnd(node, false, navigability),
    ),
    ...navigableNodes
      .filter((node) => attr(node, 'xmi:id') !== undefined)
      .map((node) => readOwnedEnd(node, true, navigability)),
  ];

  const memberRefs = (toArray(element['memberEnd']) as RawXmlNode[])
    .map((node) => firstAttr(node, 'xmi:idref', 'idref'))
    .filter((ref): ref is string => ref !== undefined);

  // `memberEnd` fija el orden de los extremos; sin el se respeta el del documento.
  if (memberRefs.length >= 2) {
    const resolved = memberRefs
      .map((ref) => owned.find((end) => end.endId === ref) ?? classOwned.byEndId.get(ref))
      .filter((end): end is AssociationEnd => end !== undefined);
    if (resolved.length >= 2) {
      return resolved;
    }
  }

  const fromClasses =
    associationRawId === undefined ? [] : (classOwned.byAssociation.get(associationRawId) ?? []);

  return [...owned, ...fromClasses.filter((end) => !owned.some((o) => o.endId === end.endId))];
}

/** Extremos que la asociacion declara navegables. */
interface Navigability {
  readonly refs: ReadonlySet<string>;
  /** Cierto si la asociacion enumera sus extremos navegables. */
  readonly declared: boolean;
}

/** Lee un extremo declarado dentro de la asociacion. */
function readOwnedEnd(
  node: RawXmlNode,
  navigableByTag: boolean,
  navigability: Navigability,
): AssociationEnd {
  const endId = attr(node, 'xmi:id');
  const explicit = firstAttr(node, 'navigable', 'isNavigable');
  const navigable =
    navigableByTag ||
    (endId !== undefined && navigability.refs.has(endId)) ||
    explicit === 'true' ||
    // Sin ninguna declaracion de navegabilidad se asume navegable, que es lo
    // que hacen las herramientas que no la exportan.
    (!navigability.declared && explicit !== 'false');

  return {
    endId,
    typeId: typeReference(node),
    role: firstAttr(node, 'name', 'role') ?? '',
    multiplicity: normalizeMultiplicity(
      childValue(node, 'lowerValue') ?? '1',
      childValue(node, 'upperValue') ?? '1',
    ),
    navigable,
    aggregation: attr(node, 'aggregation') ?? 'none',
  };
}

/** Orientacion ya decidida: que clase es el origen y que extremo va con cada una. */
interface Orientation {
  sourceRawId: string | undefined;
  targetRawId: string | undefined;
  sourceEnd: AssociationEnd;
  targetEnd: AssociationEnd;
}

/**
 * Decide que extremo es el origen, por este orden:
 * 1. Enterprise Architect nombra sus extremos `EAID_src...` y `EAID_dst...`.
 * 2. Si una sola clase posee un extremo, describe "esta clase ve a la del otro
 *    lado": su duenno es el origen y su tipo el destino.
 * 3. En cualquier otro caso manda el orden de `memberEnd`.
 */
function orientEnds(ends: readonly AssociationEnd[]): Orientation {
  const eaSource = ends.find((end) => end.endId?.startsWith('EAID_src') === true);
  const eaTarget = ends.find((end) => end.endId?.startsWith('EAID_dst') === true);
  if (eaSource !== undefined && eaTarget !== undefined) {
    return {
      sourceRawId: eaSource.typeId,
      targetRawId: eaTarget.typeId,
      sourceEnd: eaSource,
      targetEnd: eaTarget,
    };
  }

  const classOwnedEnds = ends.filter((end) => end.ownerClassId !== undefined);
  const classOwnedEnd = classOwnedEnds.length === 1 ? classOwnedEnds[0] : undefined;
  if (classOwnedEnd !== undefined) {
    const other = ends.find((end) => end !== classOwnedEnd) ?? NEUTRAL_END;
    return {
      sourceRawId: classOwnedEnd.ownerClassId,
      targetRawId: classOwnedEnd.typeId,
      sourceEnd: other,
      targetEnd: classOwnedEnd,
    };
  }

  const [first, second] = ends;
  return {
    sourceRawId: first?.typeId,
    targetRawId: second?.typeId,
    sourceEnd: first ?? NEUTRAL_END,
    targetEnd: second ?? NEUTRAL_END,
  };
}

function toModelEnd(end: AssociationEnd): UMLRelationship['sourceEnd'] {
  return {
    name: '',
    role: end.role,
    multiplicity: end.multiplicity,
    navigable: end.navigable,
  };
}
