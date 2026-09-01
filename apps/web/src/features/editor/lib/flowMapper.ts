import type { UMLClass, UMLEnum, UMLModel, UMLRelationship } from '@uml-forge/uml-core';
import type { UmlEdge, UmlNode } from '../types';

export function modelToNodes(model: UMLModel): UmlNode[] {
  const classNodes: UmlNode[] = model.classes.map((cls: UMLClass) => ({
    id: cls.id,
    type: 'umlClass' as const,
    position: cls.position || { x: 100, y: 100 },
    data: {
      classifierId: cls.id,
      name: cls.name,
      isAbstract: cls.isAbstract,
      isInterface: cls.isInterface,
      isEnum: false,
      stereotypes: cls.stereotypes,
      attributes: cls.attributes,
      operations: cls.operations,
    },
  }));

  const enumNodes: UmlNode[] = model.enums.map((enm: UMLEnum, index: number) => ({
    id: enm.id,
    type: 'umlClass' as const,
    position: { x: 400 + index * 40, y: 100 + index * 40 },
    data: {
      classifierId: enm.id,
      name: enm.name,
      isAbstract: false,
      isInterface: false,
      isEnum: true,
      stereotypes: [],
      attributes: [],
      operations: [],
      literals: enm.literals.map((lit, i) => ({ id: `${enm.id}-lit-${i}`, name: lit })),
    },
  }));

  return [...classNodes, ...enumNodes];
}

export function modelToEdges(model: UMLModel): UmlEdge[] {
  return model.relationships.map((rel: UMLRelationship) => ({
    id: rel.id,
    type: 'umlRelationship' as const,
    source: rel.sourceId,
    target: rel.targetId,
    data: {
      relationshipId: rel.id,
      type: rel.kind,
      name: rel.name,
      sourceRole: rel.sourceEnd?.role,
      targetRole: rel.targetEnd?.role,
      sourceMultiplicity: rel.sourceEnd?.multiplicity,
      targetMultiplicity: rel.targetEnd?.multiplicity,
      isNavigable: rel.targetEnd?.navigable ?? false,
    },
  }));
}
