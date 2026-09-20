import { isCollection, type UMLClass, type UMLEnum, type UMLModel } from '@uml-forge/uml-core';
import type {
  AnalyzedEntity,
  AnalyzedModel,
  CodegenOptions,
  EntityRelationshipField,
} from './types.js';
import {
  pluralize,
  sanitizeJavaIdentifier,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
} from './naming.js';

/** Analiza las relaciones del modelo y construye los campos para cada entidad. */
function buildRelationshipFields(
  umlClass: UMLClass,
  model: UMLModel,
  classMap: Map<string, UMLClass>,
): EntityRelationshipField[] {
  const fields: EntityRelationshipField[] = [];

  for (const rel of model.relationships) {
    if (rel.kind === 'generalization' || rel.kind === 'realization' || rel.kind === 'dependency') {
      continue;
    }

    const isSource = rel.sourceId === umlClass.id;
    const isTarget = rel.targetId === umlClass.id;

    if (!isSource && !isTarget) continue;

    const otherClassId = isSource ? rel.targetId : rel.sourceId;
    const otherClass = classMap.get(otherClassId);
    if (!otherClass || otherClass.isInterface) continue;

    const isSelfReference = rel.sourceId === rel.targetId;
    const isComposition = rel.kind === 'composition';

    const sourceMany = isCollection(rel.sourceEnd.multiplicity);
    const targetMany = isCollection(rel.targetEnd.multiplicity);

    if (isSelfReference) {
      if (isSource) {
        fields.push({
          relationshipId: rel.id,
          fieldName: sanitizeJavaIdentifier(rel.targetEnd.role || rel.targetEnd.name || 'parent'),
          targetClassName: toPascalCase(umlClass.name),
          isCollection: false,
          annotation: 'ManyToOne',
          isOwningSide: true,
          joinColumnName: `${toSnakeCase(rel.targetEnd.role || 'parent')}_id`,
          isComposition: false,
          isCascadeAll: false,
        });
        fields.push({
          relationshipId: rel.id,
          fieldName: sanitizeJavaIdentifier(
            rel.sourceEnd.role || rel.sourceEnd.name || pluralize('child'),
          ),
          targetClassName: toPascalCase(umlClass.name),
          isCollection: true,
          annotation: 'OneToMany',
          isOwningSide: false,
          mappedBy: sanitizeJavaIdentifier(rel.targetEnd.role || rel.targetEnd.name || 'parent'),
          isComposition,
          isCascadeAll: isComposition,
        });
      }
      continue;
    }

    if (isSource) {
      const fieldName = sanitizeJavaIdentifier(
        rel.targetEnd.role ||
          rel.targetEnd.name ||
          (targetMany ? pluralize(toCamelCase(otherClass.name)) : toCamelCase(otherClass.name)),
      );

      if (sourceMany && targetMany) {
        const joinTable = `${toSnakeCase(umlClass.name)}_${toSnakeCase(otherClass.name)}`;
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: true,
          annotation: 'ManyToMany',
          isOwningSide: true,
          joinTableName: joinTable,
          joinColumnName: `${toSnakeCase(umlClass.name)}_id`,
          inverseJoinColumnName: `${toSnakeCase(otherClass.name)}_id`,
          isComposition: false,
          isCascadeAll: false,
        });
      } else if (!sourceMany && targetMany) {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: true,
          annotation: 'OneToMany',
          isOwningSide: false,
          mappedBy: sanitizeJavaIdentifier(
            rel.sourceEnd.role || rel.sourceEnd.name || toCamelCase(umlClass.name),
          ),
          isComposition,
          isCascadeAll: isComposition,
        });
      } else if (sourceMany && !targetMany) {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: false,
          annotation: 'ManyToOne',
          isOwningSide: true,
          joinColumnName: `${toSnakeCase(otherClass.name)}_id`,
          isComposition: false,
          isCascadeAll: false,
        });
      } else {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: false,
          annotation: 'OneToOne',
          isOwningSide: true,
          joinColumnName: `${toSnakeCase(otherClass.name)}_id`,
          isComposition,
          isCascadeAll: isComposition,
        });
      }
    } else if (isTarget) {
      const fieldName = sanitizeJavaIdentifier(
        rel.sourceEnd.role ||
          rel.sourceEnd.name ||
          (sourceMany ? pluralize(toCamelCase(otherClass.name)) : toCamelCase(otherClass.name)),
      );

      if (sourceMany && targetMany) {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: true,
          annotation: 'ManyToMany',
          isOwningSide: false,
          mappedBy: sanitizeJavaIdentifier(
            rel.targetEnd.role || rel.targetEnd.name || pluralize(toCamelCase(umlClass.name)),
          ),
          isComposition: false,
          isCascadeAll: false,
        });
      } else if (!sourceMany && targetMany) {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: false,
          annotation: 'ManyToOne',
          isOwningSide: true,
          joinColumnName: `${toSnakeCase(otherClass.name)}_id`,
          isComposition: false,
          isCascadeAll: false,
        });
      } else if (sourceMany && !targetMany) {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: true,
          annotation: 'OneToMany',
          isOwningSide: false,
          mappedBy: sanitizeJavaIdentifier(
            rel.targetEnd.role || rel.targetEnd.name || toCamelCase(umlClass.name),
          ),
          isComposition,
          isCascadeAll: isComposition,
        });
      } else {
        fields.push({
          relationshipId: rel.id,
          fieldName,
          targetClassName: toPascalCase(otherClass.name),
          isCollection: false,
          annotation: 'OneToOne',
          isOwningSide: false,
          mappedBy: sanitizeJavaIdentifier(
            rel.targetEnd.role || rel.targetEnd.name || toCamelCase(umlClass.name),
          ),
          isComposition,
          isCascadeAll: isComposition,
        });
      }
    }
  }

  return fields;
}

/** Analiza el modelo UML completo y produce un modelo estructurado para codegen. */
export function analyzeModel(model: UMLModel, options: CodegenOptions): AnalyzedModel {
  const classMap = new Map<string, UMLClass>();
  const enumMap = new Map<string, UMLEnum>();
  const interfaceMap = new Map<string, UMLClass>();

  for (const c of model.classes) {
    if (c.isInterface) {
      interfaceMap.set(c.id, c);
    } else {
      classMap.set(c.id, c);
    }
  }
  for (const e of model.enums) {
    enumMap.set(e.id, e);
  }

  const parentChildMap = new Map<string, string>();
  const parentSubclassesCount = new Map<string, number>();
  const implementsMap = new Map<string, string[]>();

  for (const rel of model.relationships) {
    if (rel.kind === 'generalization') {
      parentChildMap.set(rel.sourceId, rel.targetId);
      const count = parentSubclassesCount.get(rel.targetId) ?? 0;
      parentSubclassesCount.set(rel.targetId, count + 1);
    } else if (rel.kind === 'realization') {
      const list = implementsMap.get(rel.sourceId) ?? [];
      const targetIface = interfaceMap.get(rel.targetId);
      if (targetIface) {
        list.push(toPascalCase(targetIface.name));
      }
      implementsMap.set(rel.sourceId, list);
    }
  }

  const entities = new Map<string, AnalyzedEntity>();

  for (const [id, umlClass] of classMap.entries()) {
    const parentId = parentChildMap.get(id);
    const parentClass = parentId ? classMap.get(parentId) : undefined;
    const parentClassName = parentClass ? toPascalCase(parentClass.name) : undefined;
    const implementedInterfaces = implementsMap.get(id) ?? [];
    const hasSubclasses = (parentSubclassesCount.get(id) ?? 0) > 0;

    const idProperty = umlClass.attributes.find(
      (a) => a.isIdentifier || a.name.toLowerCase() === 'id',
    );
    const nonIdAttributes = umlClass.attributes.filter((a) => a !== idProperty);

    const relationships = buildRelationshipFields(umlClass, model, classMap);

    entities.set(id, {
      umlClass,
      javaClassName: toPascalCase(umlClass.name),
      tableName: pluralize(toSnakeCase(umlClass.name)),
      isAbstract: umlClass.isAbstract,
      isInterface: false,
      parentClassName,
      implementedInterfaces,
      hasSubclasses,
      idProperty,
      attributes: nonIdAttributes,
      operations: umlClass.operations,
      relationships,
    });
  }

  return {
    rawModel: model,
    options,
    entities,
    enums: enumMap,
    interfaces: interfaceMap,
  };
}
