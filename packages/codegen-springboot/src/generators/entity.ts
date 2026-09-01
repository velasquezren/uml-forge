import type { AnalyzedEntity, AnalyzedModel, CodegenOptions, GeneratedFile } from '../types.js';
import { sanitizeJavaIdentifier, toCamelCase, toPascalCase } from '../naming.js';
import { generateAttributeField, generateRelationshipField } from './entity-helpers.js';
import { mapUmlTypeToJava } from './type-helper.js';

/** Genera el fichero Java @Entity para un clasificador UML. */
export function generateJavaEntity(
  entity: AnalyzedEntity,
  model: AnalyzedModel,
  options: CodegenOptions,
): GeneratedFile {
  const packagePath = options.packageName.replace(/\./g, '/');
  const importSet = new Set<string>([
    'jakarta.persistence.Entity',
    'jakarta.persistence.Table',
    'java.io.Serializable',
  ]);

  const classAnnotations: string[] = ['@Entity', `@Table(name = "${entity.tableName}")`];

  if (entity.hasSubclasses) {
    classAnnotations.push('@Inheritance(strategy = InheritanceType.JOINED)');
    importSet.add('jakarta.persistence.Inheritance');
    importSet.add('jakarta.persistence.InheritanceType');
  }

  const isSubclass = Boolean(entity.parentClassName);
  const extendsClause = entity.parentClassName ? ` extends ${entity.parentClassName}` : '';
  const interfaces = ['Serializable', ...entity.implementedInterfaces];
  const implementsClause = ` implements ${interfaces.join(', ')}`;
  const abstractModifier = entity.isAbstract ? 'abstract ' : '';

  const fieldDeclarations: string[] = [];
  const getterSetters: string[] = [];

  // ID primario solo en la raiz de la jerarquia
  if (!isSubclass) {
    importSet.add('jakarta.persistence.Id');
    importSet.add('jakarta.persistence.GeneratedValue');
    importSet.add('jakarta.persistence.GenerationType');

    fieldDeclarations.push(
      '    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;',
    );
    getterSetters.push(
      `    public Long getId() {\n        return this.id;\n    }\n\n    public void setId(Long id) {\n        this.id = id;\n    }`,
    );
  }

  // Atributos escalares
  for (const attr of entity.attributes) {
    const res = generateAttributeField(attr, model);
    fieldDeclarations.push(res.declaration);
    getterSetters.push(res.getterSetter);
    res.imports.forEach((imp) => importSet.add(imp));
  }

  // Relaciones
  for (const rel of entity.relationships) {
    const res = generateRelationshipField(rel);
    fieldDeclarations.push(res.declaration);
    getterSetters.push(res.getterSetter);
    res.imports.forEach((imp) => importSet.add(imp));
  }

  // Operaciones de la clase y de interfaces implementadas
  const implementedOps: string[] = [];
  const emittedOpSignatures = new Set<string>();

  for (const op of entity.operations) {
    const returnTypeInfo = mapUmlTypeToJava(op.returnType, model);
    returnTypeInfo.imports.forEach((imp) => importSet.add(imp));

    const params = op.parameters.map((p) => {
      const pType = mapUmlTypeToJava(p.type, model);
      pType.imports.forEach((imp) => importSet.add(imp));
      return `${pType.javaType} ${sanitizeJavaIdentifier(p.name)}`;
    });

    const opSignature = `${toCamelCase(op.name)}(${params.join(', ')})`;
    emittedOpSignatures.add(opSignature);

    let defaultReturn = '';
    if (returnTypeInfo.javaType === 'boolean' || returnTypeInfo.javaType === 'Boolean') {
      defaultReturn = 'return false;';
    } else if (
      returnTypeInfo.javaType === 'int' ||
      returnTypeInfo.javaType === 'Integer' ||
      returnTypeInfo.javaType === 'Long' ||
      returnTypeInfo.javaType === 'Double'
    ) {
      defaultReturn = 'return 0;';
    } else if (returnTypeInfo.javaType !== 'void') {
      defaultReturn = 'return null;';
    }

    implementedOps.push(
      `    public ${returnTypeInfo.javaType} ${opSignature} {\n        // Implementacion generada\n        ${defaultReturn}\n    }`,
    );
  }

  // Verificar operaciones de interfaces implementadas que falten
  for (const ifaceName of entity.implementedInterfaces) {
    const iface = Array.from(model.interfaces.values()).find(
      (i) => toPascalCase(i.name) === ifaceName,
    );
    if (iface) {
      for (const op of iface.operations) {
        const returnTypeInfo = mapUmlTypeToJava(op.returnType, model);
        returnTypeInfo.imports.forEach((imp) => importSet.add(imp));

        const params = op.parameters.map((p) => {
          const pType = mapUmlTypeToJava(p.type, model);
          pType.imports.forEach((imp) => importSet.add(imp));
          return `${pType.javaType} ${sanitizeJavaIdentifier(p.name)}`;
        });

        const sig = `${toCamelCase(op.name)}(${params.join(', ')})`;
        if (!emittedOpSignatures.has(sig)) {
          emittedOpSignatures.add(sig);
          let defaultReturn = '';
          if (returnTypeInfo.javaType === 'boolean' || returnTypeInfo.javaType === 'Boolean') {
            defaultReturn = 'return false;';
          } else if (
            returnTypeInfo.javaType === 'int' ||
            returnTypeInfo.javaType === 'Integer' ||
            returnTypeInfo.javaType === 'Long' ||
            returnTypeInfo.javaType === 'Double'
          ) {
            defaultReturn = 'return 0;';
          } else if (returnTypeInfo.javaType !== 'void') {
            defaultReturn = 'return null;';
          }

          implementedOps.push(
            `    @Override\n    public ${returnTypeInfo.javaType} ${sig} {\n        // Metodo de interfaz ${ifaceName}\n        ${defaultReturn}\n    }`,
          );
        }
      }
    }
  }

  const sortedImports = Array.from(importSet)
    .filter((imp) => !imp.startsWith(`${options.packageName}.model`))
    .sort()
    .map((imp) => `import ${imp};`)
    .join('\n');

  const content = `package ${options.packageName}.model;

${sortedImports}

${classAnnotations.join('\n')}
public ${abstractModifier}class ${entity.javaClassName}${extendsClause}${implementsClause} {

    private static final long serialVersionUID = 1L;

${fieldDeclarations.join('\n\n')}

    public ${entity.javaClassName}() {
        // Constructor sin argumentos requerido por JPA
    }

${getterSetters.join('\n\n')}
${implementedOps.length > 0 ? `\n${implementedOps.join('\n\n')}\n` : ''}
}
`;

  return {
    path: `src/main/java/${packagePath}/model/${entity.javaClassName}.java`,
    content,
  };
}
