import { applyOperations } from '../src/operations/apply.js';
import type { UmlOperationInput } from '../src/operations/schema.js';
import { createEmptyModel } from '../src/model/create.js';
import type { UMLModel } from '../src/schemas/model.js';

/** Marca temporal fija para que las pruebas sean deterministas. */
export const NOW = '2026-01-01T00:00:00.000Z';
export const LATER = '2026-01-02T00:00:00.000Z';

/** Genera identificadores validos y legibles a partir de un numero. */
export function testId(seed: number): string {
  return `${seed.toString().padStart(8, '0')}-1111-4111-8111-111111111111`;
}

export const IDS = {
  model: testId(1),
  pet: testId(10),
  owner: testId(11),
  appointment: testId(12),
  animal: testId(13),
  species: testId(20),
  petName: testId(30),
  petSpecies: testId(31),
  ownerName: testId(32),
  petOwner: testId(40),
  ownerAppointments: testId(41),
  operation: testId(50),
  parameter: testId(51),
} as const;

/** Modelo vacio con identificador y fechas fijas. */
export function emptyModel(): UMLModel {
  return createEmptyModel('Veterinaria', { id: IDS.model, now: NOW });
}

/** Aplica una lista de operaciones y falla si alguna no se pudo aplicar. */
export function build(
  operations: readonly UmlOperationInput[],
  from: UMLModel = emptyModel(),
): UMLModel {
  const result = applyOperations(from, operations, { now: NOW });
  if (!result.ok) {
    throw new Error(`fixture invalida: ${result.error.code} ${result.error.message}`);
  }
  return result.value;
}

/** Operaciones que construyen el modelo de veterinaria usado en varias pruebas. */
export const VETERINARY_OPERATIONS: readonly UmlOperationInput[] = [
  { type: 'addClass', class: { id: IDS.owner, name: 'Owner', position: { x: 0, y: 0 } } },
  { type: 'addClass', class: { id: IDS.pet, name: 'Pet', position: { x: 300, y: 0 } } },
  { type: 'addEnum', enum: { id: IDS.species, name: 'Species', literals: ['DOG', 'CAT'] } },
  {
    type: 'addAttribute',
    classId: IDS.owner,
    attribute: { id: IDS.ownerName, name: 'name', type: 'String', isNullable: false },
  },
  {
    type: 'addAttribute',
    classId: IDS.pet,
    attribute: { id: IDS.petName, name: 'name', type: 'String', isNullable: false },
  },
  {
    type: 'addAttribute',
    classId: IDS.pet,
    attribute: { id: IDS.petSpecies, name: 'species', type: IDS.species },
  },
  {
    type: 'addRelationship',
    relationship: {
      id: IDS.petOwner,
      kind: 'composition',
      name: 'tiene',
      sourceId: IDS.owner,
      targetId: IDS.pet,
      sourceEnd: { role: 'owner', multiplicity: '1' },
      targetEnd: { role: 'pets', multiplicity: '0..*' },
    },
  },
];

/** Modelo de veterinaria completo. */
export function veterinaryModel(): UMLModel {
  return build(VETERINARY_OPERATIONS);
}

/** Ordena las colecciones para poder comparar modelos independientemente del orden. */
export function normalize(model: UMLModel): UMLModel {
  const byId = (left: { id: string }, right: { id: string }): number =>
    left.id.localeCompare(right.id);
  return {
    ...model,
    classes: [...model.classes].sort(byId),
    enums: [...model.enums].sort(byId),
    relationships: [...model.relationships].sort(byId),
  };
}
