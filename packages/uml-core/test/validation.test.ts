import { describe, expect, it } from 'vitest';
import { isValidModel, validateModel } from '../src/validation/validate-model.js';
import type { UMLClass, UMLProperty } from '../src/schemas/elements.js';
import type { UMLModel } from '../src/schemas/model.js';
import type { UMLRelationship } from '../src/schemas/relationships.js';
import { IDS, testId, veterinaryModel } from './fixtures.js';

/** Codigos de error presentes en el resultado de la validacion. */
function codes(model: UMLModel): string[] {
  return validateModel(model).map((error) => error.code);
}

function classFrom(model: UMLModel, classId: string): UMLClass {
  const found = model.classes.find((candidate) => candidate.id === classId);
  if (found === undefined) {
    throw new Error(`la fixture deberia contener la clase ${classId}`);
  }
  return found;
}

function attribute(overrides: Partial<UMLProperty>): UMLProperty {
  return {
    id: testId(500),
    name: 'field',
    type: 'String',
    visibility: 'private',
    multiplicity: '1',
    isStatic: false,
    isDerived: false,
    isUnique: false,
    isNullable: true,
    isIdentifier: false,
    defaultValue: null,
    ...overrides,
  };
}

function relationship(overrides: Partial<UMLRelationship>): UMLRelationship {
  const end = { name: '', multiplicity: '1', navigable: true, role: '' };
  return {
    id: testId(600),
    kind: 'association',
    name: '',
    sourceId: IDS.owner,
    targetId: IDS.pet,
    sourceEnd: end,
    targetEnd: end,
    ...overrides,
  };
}

describe('validacion del modelo', () => {
  it('no encuentra problemas en un modelo correcto', () => {
    const model = veterinaryModel();
    expect(validateModel(model)).toEqual([]);
    expect(isValidModel(model)).toBe(true);
  });

  it('detecta identificadores repetidos', () => {
    const model = veterinaryModel();
    const duplicated: UMLModel = {
      ...model,
      classes: [...model.classes, { ...classFrom(model, IDS.pet), name: 'Clon' }],
    };
    expect(codes(duplicated)).toContain('duplicate_id');
    expect(isValidModel(duplicated)).toBe(false);
  });

  it('detecta un nombre compartido entre una clase y una enumeracion', () => {
    const model = veterinaryModel();
    const clash: UMLModel = {
      ...model,
      enums: model.enums.map((umlEnum) => ({ ...umlEnum, name: 'Pet' })),
    };
    expect(codes(clash)).toContain('duplicate_name');
  });

  it('detecta atributos y operaciones repetidos dentro de una clase', () => {
    const model = veterinaryModel();
    const pet = classFrom(model, IDS.pet);
    const broken: UMLModel = {
      ...model,
      classes: model.classes.map((candidate) =>
        candidate.id === IDS.pet
          ? {
              ...pet,
              attributes: [...pet.attributes, attribute({ id: testId(501), name: 'NAME' })],
              operations: [
                {
                  id: testId(502),
                  name: 'feed',
                  returnType: null,
                  visibility: 'public',
                  isAbstract: false,
                  isStatic: false,
                  parameters: [],
                },
                {
                  id: testId(503),
                  name: 'feed',
                  returnType: null,
                  visibility: 'public',
                  isAbstract: false,
                  isStatic: false,
                  parameters: [],
                },
              ],
            }
          : candidate,
      ),
    };
    expect(codes(broken).filter((code) => code === 'duplicate_name')).toHaveLength(2);
  });

  it('detecta literales repetidos en una enumeracion', () => {
    const model = veterinaryModel();
    const broken: UMLModel = {
      ...model,
      enums: model.enums.map((umlEnum) => ({ ...umlEnum, literals: ['DOG', 'DOG'] })),
    };
    expect(codes(broken)).toContain('duplicate_name');
  });

  it('detecta relaciones que apuntan a clases inexistentes', () => {
    const model = veterinaryModel();
    const broken: UMLModel = {
      ...model,
      relationships: [relationship({ sourceId: testId(900), targetId: testId(901) })],
    };
    expect(codes(broken).filter((code) => code === 'dangling_reference')).toHaveLength(2);
  });

  it('detecta tipos que no se resuelven en atributos, retornos y parametros', () => {
    const model = veterinaryModel();
    const pet = classFrom(model, IDS.pet);
    const broken: UMLModel = {
      ...model,
      classes: model.classes.map((candidate) =>
        candidate.id === IDS.pet
          ? {
              ...pet,
              attributes: [attribute({ id: testId(504), type: testId(902) })],
              operations: [
                {
                  id: testId(505),
                  name: 'ghost',
                  returnType: testId(903),
                  visibility: 'public',
                  isAbstract: false,
                  isStatic: false,
                  parameters: [{ id: testId(506), name: 'p', type: testId(904), direction: 'in' }],
                },
              ],
            }
          : candidate,
      ),
    };
    expect(codes(broken).filter((code) => code === 'unknown_type')).toHaveLength(3);
  });

  it('detecta ciclos de herencia', () => {
    const model = veterinaryModel();
    const broken: UMLModel = {
      ...model,
      relationships: [
        relationship({
          id: testId(601),
          kind: 'generalization',
          sourceId: IDS.pet,
          targetId: IDS.owner,
        }),
        relationship({
          id: testId(602),
          kind: 'generalization',
          sourceId: IDS.owner,
          targetId: IDS.pet,
        }),
      ],
    };
    expect(codes(broken)).toContain('cyclic_inheritance');
  });

  it('detecta realizaciones y generalizaciones mal usadas', () => {
    const model = veterinaryModel();
    const broken: UMLModel = {
      ...model,
      classes: model.classes.map((candidate) =>
        candidate.id === IDS.owner ? { ...candidate, isInterface: true } : candidate,
      ),
      relationships: [
        relationship({
          id: testId(603),
          kind: 'realization',
          sourceId: IDS.owner,
          targetId: IDS.pet,
        }),
        relationship({
          id: testId(604),
          kind: 'generalization',
          sourceId: IDS.pet,
          targetId: IDS.owner,
        }),
      ],
    };
    const found = codes(broken);
    expect(found).toContain('invalid_realization');
    expect(found).toContain('invalid_generalization');
  });

  it('detecta multiplicidades mal formadas o incoherentes', () => {
    const model = veterinaryModel();
    const pet = classFrom(model, IDS.pet);
    const broken: UMLModel = {
      ...model,
      classes: model.classes.map((candidate) =>
        candidate.id === IDS.pet
          ? { ...pet, attributes: [attribute({ id: testId(507), multiplicity: '5..2' })] }
          : candidate,
      ),
      relationships: [
        relationship({
          id: testId(605),
          sourceEnd: { name: '', multiplicity: 'muchos', navigable: true, role: '' },
          targetEnd: { name: '', multiplicity: '1', navigable: true, role: '' },
        }),
      ],
    };
    expect(codes(broken).filter((code) => code === 'invalid_multiplicity')).toHaveLength(2);
  });
});
