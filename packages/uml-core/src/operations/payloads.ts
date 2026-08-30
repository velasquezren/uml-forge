import { z } from 'zod';
import { ParameterDirectionSchema } from '../schemas/elements.js';
import { MultiplicitySchema } from '../schemas/multiplicity.js';
import {
  IdSchema,
  NameSchema,
  PositionSchema,
  TypeReferenceSchema,
  VisibilitySchema,
} from '../schemas/primitives.js';
import { RelationshipKindSchema } from '../schemas/relationships.js';

/**
 * Payloads de entrada del lenguaje de operaciones. A diferencia de los esquemas
 * del modelo, aqui casi todo tiene valor por defecto: quien emite operaciones
 * (la interfaz, la cola offline o un modelo de lenguaje) solo declara lo que le
 * importa. El identificador es siempre obligatorio y estable.
 */

const StereotypeSchema = z.string().trim().min(1);
const LiteralSchema = z.string().trim().min(1);

export const ClassInputSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  isAbstract: z.boolean().default(false),
  isInterface: z.boolean().default(false),
  stereotypes: z.array(StereotypeSchema).default([]),
  position: PositionSchema.default({ x: 0, y: 0 }),
});

export const ClassChangesSchema = z.object({
  name: NameSchema.optional(),
  isAbstract: z.boolean().optional(),
  isInterface: z.boolean().optional(),
  stereotypes: z.array(StereotypeSchema).optional(),
  position: PositionSchema.optional(),
});

export const AttributeInputSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  type: TypeReferenceSchema,
  visibility: VisibilitySchema.default('private'),
  multiplicity: MultiplicitySchema.default('1'),
  isStatic: z.boolean().default(false),
  isDerived: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  isNullable: z.boolean().default(true),
  isIdentifier: z.boolean().default(false),
  defaultValue: z.string().nullable().default(null),
});

export const AttributeChangesSchema = z.object({
  name: NameSchema.optional(),
  type: TypeReferenceSchema.optional(),
  visibility: VisibilitySchema.optional(),
  multiplicity: MultiplicitySchema.optional(),
  isStatic: z.boolean().optional(),
  isDerived: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  isNullable: z.boolean().optional(),
  isIdentifier: z.boolean().optional(),
  defaultValue: z.string().nullable().optional(),
});

export const ParameterInputSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  type: TypeReferenceSchema,
  direction: ParameterDirectionSchema.default('in'),
});

export const OperationInputSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  returnType: TypeReferenceSchema.nullable().default(null),
  visibility: VisibilitySchema.default('public'),
  isAbstract: z.boolean().default(false),
  isStatic: z.boolean().default(false),
  parameters: z.array(ParameterInputSchema).default([]),
});

export const OperationChangesSchema = z.object({
  name: NameSchema.optional(),
  returnType: TypeReferenceSchema.nullable().optional(),
  visibility: VisibilitySchema.optional(),
  isAbstract: z.boolean().optional(),
  isStatic: z.boolean().optional(),
  parameters: z.array(ParameterInputSchema).optional(),
});

export const EndInputSchema = z.object({
  name: z.string().default(''),
  multiplicity: MultiplicitySchema.default('1'),
  navigable: z.boolean().default(true),
  role: z.string().default(''),
});

/** Extremo por defecto: sin nombre, multiplicidad 1 y navegable. */
const DEFAULT_END = { name: '', multiplicity: '1', navigable: true, role: '' };

export const RelationshipInputSchema = z.object({
  id: IdSchema,
  kind: RelationshipKindSchema,
  name: z.string().default(''),
  sourceId: IdSchema,
  targetId: IdSchema,
  sourceEnd: EndInputSchema.default(DEFAULT_END),
  targetEnd: EndInputSchema.default(DEFAULT_END),
});

export const RelationshipChangesSchema = z.object({
  kind: RelationshipKindSchema.optional(),
  name: z.string().optional(),
  sourceId: IdSchema.optional(),
  targetId: IdSchema.optional(),
  sourceEnd: EndInputSchema.optional(),
  targetEnd: EndInputSchema.optional(),
});

export const EnumInputSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  literals: z.array(LiteralSchema).default([]),
});

export const EnumChangesSchema = z.object({
  name: NameSchema.optional(),
  literals: z.array(LiteralSchema).optional(),
});
