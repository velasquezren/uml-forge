import type { UMLRelationship } from '@uml-forge/uml-core';

/** Trazo y marcadores SVG que distinguen visualmente cada clase de relacion. */
export interface EdgeStyle {
  /** Marcador en el extremo origen. La composicion y la agregacion llevan rombo. */
  readonly markerStart?: string;
  /** Marcador fijo en el extremo destino; si falta, lo decide la navegabilidad. */
  readonly markerEnd?: string;
  /** Patron de linea discontinua, para realizacion y dependencia. */
  readonly strokeDasharray?: string;
}

export const EDGE_STYLE_BY_KIND: Record<UMLRelationship['kind'], EdgeStyle> = {
  generalization: { markerEnd: 'url(#uml-marker-generalization)' },
  realization: { markerEnd: 'url(#uml-marker-realization)', strokeDasharray: '6,4' },
  composition: { markerStart: 'url(#uml-marker-composition)' },
  aggregation: { markerStart: 'url(#uml-marker-aggregation)' },
  dependency: { markerEnd: 'url(#uml-marker-dependency)', strokeDasharray: '5,5' },
  association: {},
};

/** Etiquetas en espanol de cada clase de relacion, para la paleta y el inspector. */
export const RELATIONSHIP_KIND_LABELS: Record<UMLRelationship['kind'], string> = {
  association: 'Asociacion',
  generalization: 'Herencia / Generalizacion',
  realization: 'Realizacion de Interfaz',
  composition: 'Composicion',
  aggregation: 'Agregacion',
  dependency: 'Dependencia',
};

/** Orden estable en el que se ofrecen las relaciones en la interfaz. */
export const RELATIONSHIP_KINDS: readonly UMLRelationship['kind'][] = [
  'association',
  'generalization',
  'realization',
  'composition',
  'aggregation',
  'dependency',
];
