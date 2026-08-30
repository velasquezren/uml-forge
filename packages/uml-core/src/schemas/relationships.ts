import { z } from 'zod';
import { MultiplicitySchema } from './multiplicity.js';
import { IdSchema } from './primitives.js';

/** Tipos de relacion soportados. */
export const RelationshipKindSchema = z.enum([
  'association',
  'aggregation',
  'composition',
  'generalization',
  'realization',
  'dependency',
]);
export type RelationshipKind = z.infer<typeof RelationshipKindSchema>;

/** Extremo de una relacion. */
export const UMLEndSchema = z.object({
  name: z.string(),
  multiplicity: MultiplicitySchema,
  navigable: z.boolean(),
  role: z.string(),
});
export type UMLEnd = z.infer<typeof UMLEndSchema>;

/** Relacion entre dos clases del modelo. */
export const UMLRelationshipSchema = z.object({
  id: IdSchema,
  kind: RelationshipKindSchema,
  name: z.string(),
  sourceId: IdSchema,
  targetId: IdSchema,
  sourceEnd: UMLEndSchema,
  targetEnd: UMLEndSchema,
});
export type UMLRelationship = z.infer<typeof UMLRelationshipSchema>;

/** Relaciones que expresan herencia y que por tanto no pueden formar ciclos. */
export const INHERITANCE_KINDS: readonly RelationshipKind[] = ['generalization', 'realization'];
