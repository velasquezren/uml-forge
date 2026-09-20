import { z } from 'zod';
import { UMLClassSchema, UMLEnumSchema } from './elements.js';
import { IdSchema, NameSchema } from './primitives.js';
import { UMLRelationshipSchema } from './relationships.js';

/** Modelo UML completo. Es la unidad que se persiste y se comparte. */
export const UMLModelSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  classes: z.array(UMLClassSchema),
  enums: z.array(UMLEnumSchema),
  relationships: z.array(UMLRelationshipSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type UMLModel = z.infer<typeof UMLModelSchema>;
