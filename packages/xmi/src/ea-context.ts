import type { UMLClass, UMLEnum, UMLModel } from '@uml-forge/uml-core';
import { eaId, eaPackageId } from './ea-ids.js';
import type { TypeResolver } from './serializer-types.js';

/** Clasificador colocable en el diagrama: clase, interfaz o enumeracion. */
export type Classifier = UMLClass | UMLEnum;

/** Datos que comparten las secciones de la extension de Enterprise Architect. */
export interface EaExportContext {
  readonly model: UMLModel;
  readonly types: TypeResolver;
  /** `EAPK_` del paquete que contiene el modelo y el diagrama. */
  readonly packageId: string;
  /** `EAID_` del elemento que representa a ese mismo paquete. */
  readonly packageElementId: string;
  /** Paquete padre ficticio: Enterprise Architect lo sustituye por el de destino. */
  readonly parentPackageId: string;
  /** `ea_localid` de cada clasificador, indexado por su UUID. */
  readonly localIds: ReadonlyMap<string, number>;
  readonly created: string;
  readonly modified: string;
  readonly author: string;
}

export function createEaContext(
  model: UMLModel,
  types: TypeResolver,
  author: string,
): EaExportContext {
  const localIds = new Map<string, number>();
  // El 1 queda para el propio paquete.
  [...model.classes, ...model.enums].forEach((classifier, index) => {
    localIds.set(classifier.id, index + 2);
  });

  return {
    model,
    types,
    packageId: eaPackageId(model.id),
    packageElementId: eaId(model.id),
    parentPackageId: eaPackageId(`${model.id}-parent`),
    localIds,
    created: eaTimestamp(model.createdAt),
    modified: eaTimestamp(model.updatedAt),
    author,
  };
}

/** Fecha en el formato de Enterprise Architect: `AAAA-MM-DD hh:mm:ss`. */
function eaTimestamp(iso: string): string {
  const date = new Date(iso);
  const valid = Number.isNaN(date.getTime()) ? new Date(0) : date;
  return valid.toISOString().replace('T', ' ').slice(0, 19);
}

/** Tipo de elemento tal como lo nombra Enterprise Architect (`sType`). */
export function eaElementType(classifier: Classifier): 'Class' | 'Interface' | 'Enumeration' {
  if ('literals' in classifier) {
    return 'Enumeration';
  }
  return classifier.isInterface ? 'Interface' : 'Class';
}

/** Busca un clasificador del modelo por su UUID. */
export function findClassifier(model: UMLModel, id: string): Classifier | undefined {
  return model.classes.find((item) => item.id === id) ?? model.enums.find((item) => item.id === id);
}

/** Visibilidad con mayuscula inicial, que es como la escribe la extension. */
export function eaScope(visibility: string): string {
  return visibility.charAt(0).toUpperCase() + visibility.slice(1);
}
