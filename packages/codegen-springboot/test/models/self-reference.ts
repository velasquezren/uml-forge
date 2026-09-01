import type { UMLModel } from '@uml-forge/uml-core';

export const selfReferenceModel: UMLModel = {
  id: 'a0000004-0000-0000-0000-000000000001',
  name: 'Self Reference Model',
  createdAt: '2026-08-30T20:00:00.000Z',
  updatedAt: '2026-08-30T20:00:00.000Z',
  enums: [],
  classes: [
    {
      id: 'b0000004-0000-0000-0000-000000000001',
      name: 'Category',
      isAbstract: false,
      isInterface: false,
      stereotypes: [],
      position: { x: 200, y: 150 },
      attributes: [
        {
          id: 'c0000004-0000-0000-0000-000000000001',
          name: 'name',
          type: 'String',
          visibility: 'private',
          multiplicity: '1',
          isStatic: false,
          isDerived: false,
          isUnique: false,
          isNullable: false,
          isIdentifier: false,
          defaultValue: null,
        },
        {
          id: 'c0000004-0000-0000-0000-000000000002',
          name: 'description',
          type: 'String',
          visibility: 'private',
          multiplicity: '0..1',
          isStatic: false,
          isDerived: false,
          isUnique: false,
          isNullable: true,
          isIdentifier: false,
          defaultValue: null,
        },
      ],
      operations: [],
    },
  ],
  relationships: [
    {
      id: 'd0000004-0000-0000-0000-000000000001',
      kind: 'association',
      name: 'subcategories',
      sourceId: 'b0000004-0000-0000-0000-000000000001',
      targetId: 'b0000004-0000-0000-0000-000000000001',
      sourceEnd: {
        name: '',
        role: 'children',
        multiplicity: '0..*',
        navigable: true,
      },
      targetEnd: {
        name: '',
        role: 'parent',
        multiplicity: '0..1',
        navigable: true,
      },
    },
  ],
};
