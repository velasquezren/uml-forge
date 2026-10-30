import { Type, type Schema } from '@google/genai';

const text: Schema = { type: Type.STRING };
const flag: Schema = { type: Type.BOOLEAN };
const visibility: Schema = {
  type: Type.STRING,
  enum: ['public', 'private', 'protected', 'package'],
};

const attribute: Schema = {
  type: Type.OBJECT,
  properties: {
    name: text,
    type: { type: Type.STRING, description: 'Primitivo o nombre exacto de una clase/enum' },
    visibility,
    multiplicity: { type: Type.STRING, description: '1, 0..1, 0..* o 1..*' },
    isIdentifier: flag,
    isUnique: flag,
    isNullable: flag,
    defaultValue: text,
  },
  required: ['name', 'type'],
  propertyOrdering: ['name', 'type', 'visibility', 'multiplicity', 'isIdentifier', 'isUnique'],
};

const method: Schema = {
  type: Type.OBJECT,
  properties: {
    name: text,
    returnType: { type: Type.STRING, description: 'void si no devuelve nada' },
    visibility,
    isAbstract: flag,
    isStatic: flag,
    parameters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: text, type: text },
        required: ['name', 'type'],
      },
    },
  },
  required: ['name', 'returnType'],
};

/**
 * Esquema de salida estructurada de Gemini. Con `responseSchema` el servicio
 * garantiza un JSON con esta forma exacta, en lugar de confiar en que el modelo
 * siga el ejemplo del prompt: desaparecen las respuestas con texto alrededor,
 * los campos con otros nombres y los JSON cortados.
 */
export const UML_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    explanation: { type: Type.STRING, description: 'Explicacion breve en espanol' },
    classes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: text,
          isAbstract: flag,
          isInterface: flag,
          attributes: { type: Type.ARRAY, items: attribute },
          methods: { type: Type.ARRAY, items: method },
        },
        required: ['name'],
        propertyOrdering: ['name', 'isAbstract', 'isInterface', 'attributes', 'methods'],
      },
    },
    enums: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: text, literals: { type: Type.ARRAY, items: text } },
        required: ['name', 'literals'],
      },
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: text,
          target: text,
          kind: {
            type: Type.STRING,
            enum: [
              'association',
              'aggregation',
              'composition',
              'generalization',
              'realization',
              'dependency',
            ],
          },
          name: text,
          sourceRole: text,
          targetRole: text,
          sourceMultiplicity: text,
          targetMultiplicity: text,
        },
        required: ['source', 'target', 'kind'],
        propertyOrdering: [
          'source',
          'target',
          'kind',
          'name',
          'sourceRole',
          'targetRole',
          'sourceMultiplicity',
          'targetMultiplicity',
        ],
      },
    },
  },
  required: ['explanation', 'classes', 'enums', 'relationships'],
  propertyOrdering: ['explanation', 'classes', 'enums', 'relationships'],
};

/**
 * Cambios sobre elementos que ya existen (ADR 0045). Los elementos se nombran,
 * nunca se identifican por UUID: la API los busca en el modelo.
 */
const change: Schema = {
  type: Type.OBJECT,
  properties: {
    action: { type: Type.STRING, enum: ['rename', 'update', 'delete'] },
    element: {
      type: Type.STRING,
      enum: ['class', 'enum', 'attribute', 'operation', 'relationship'],
    },
    className: {
      type: Type.STRING,
      description: 'Clase o enum afectado, o dueno del miembro, u origen de la relacion',
    },
    memberName: { type: Type.STRING, description: 'Atributo u operacion afectado' },
    target: { type: Type.STRING, description: 'Destino de la relacion' },
    relationshipKind: {
      type: Type.STRING,
      description: 'Tipo actual de la relacion, si hay varias',
    },
    newName: text,
    newKind: { type: Type.STRING, description: 'Nuevo tipo de la relacion' },
    type: { type: Type.STRING, description: 'Nuevo tipo del atributo' },
    multiplicity: text,
    sourceMultiplicity: text,
    targetMultiplicity: text,
    isIdentifier: flag,
    isNullable: flag,
    isUnique: flag,
    isAbstract: flag,
    isInterface: flag,
  },
  required: ['action', 'element', 'className'],
  propertyOrdering: ['action', 'element', 'className', 'memberName', 'target', 'newName'],
};

/** Propuesta del chat: lo que se anade y lo que cambia de lo existente. */
const CHAT_PROPOSAL_SCHEMA: Schema = {
  ...UML_RESPONSE_SCHEMA,
  properties: {
    ...UML_RESPONSE_SCHEMA.properties,
    changes: { type: Type.ARRAY, items: change },
  },
  propertyOrdering: ['explanation', 'changes', 'classes', 'enums', 'relationships'],
};

/**
 * Esquema de la respuesta del chat de grupo: el texto para todos y, solo si se
 * pidio un cambio, una propuesta con lo que se anade y lo que se modifica.
 */
export const CHAT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: 'Respuesta para el chat, dirigida a quien pregunto' },
    proposal: CHAT_PROPOSAL_SCHEMA,
  },
  required: ['reply'],
  propertyOrdering: ['reply', 'proposal'],
};
