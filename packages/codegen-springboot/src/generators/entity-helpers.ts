import type { AnalyzedModel, EntityRelationshipField, UMLProperty } from '../types.js';
import { sanitizeJavaIdentifier, toPascalCase, toSnakeCase } from '../naming.js';
import { mapUmlTypeToJava } from './type-helper.js';

export interface FieldGenResult {
  readonly declaration: string;
  readonly getterSetter: string;
  readonly imports: string[];
}

/** Genera la declaracion y accesores para un atributo escalar. */
export function generateAttributeField(prop: UMLProperty, model: AnalyzedModel): FieldGenResult {
  const fieldName = sanitizeJavaIdentifier(prop.name);
  const typeInfo = mapUmlTypeToJava(prop.type, model);
  const imports = [...typeInfo.imports];
  const isEnum =
    model.enums.has(prop.type) ||
    Array.from(model.enums.values()).some((e) => e.name.toLowerCase() === prop.type.toLowerCase());

  const annotations: string[] = [];
  const colProps: string[] = [`name = "${toSnakeCase(prop.name)}"`];

  if (!prop.isNullable) colProps.push('nullable = false');
  if (prop.isUnique) colProps.push('unique = true');

  annotations.push(`    @Column(${colProps.join(', ')})`);
  imports.push('jakarta.persistence.Column');

  if (isEnum) {
    annotations.push('    @Enumerated(EnumType.STRING)');
    imports.push('jakarta.persistence.Enumerated', 'jakarta.persistence.EnumType');
  }

  const declaration = `${annotations.join('\n')}\n    private ${typeInfo.javaType} ${fieldName};`;
  const pascalName = toPascalCase(fieldName);

  const getterSetter = `    public ${typeInfo.javaType} get${pascalName}() {
        return this.${fieldName};
    }

    public void set${pascalName}(${typeInfo.javaType} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`;

  return { declaration, getterSetter, imports };
}

/** Genera la declaracion y accesores para un campo de relacion JPA. */
export function generateRelationshipField(rel: EntityRelationshipField): FieldGenResult {
  const imports: string[] = [];
  const annotations: string[] = [];
  const fieldName = rel.fieldName;
  const targetType = rel.targetClassName;
  const pascalName = toPascalCase(fieldName);

  if (rel.annotation === 'OneToOne') {
    imports.push('jakarta.persistence.OneToOne');
    if (rel.isOwningSide) {
      imports.push('jakarta.persistence.JoinColumn');
      if (rel.isCascadeAll) {
        imports.push('jakarta.persistence.CascadeType');
        annotations.push(
          `    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)\n    @JoinColumn(name = "${rel.joinColumnName}")`,
        );
      } else {
        annotations.push(`    @OneToOne\n    @JoinColumn(name = "${rel.joinColumnName}")`);
      }
    } else {
      annotations.push(`    @OneToOne(mappedBy = "${rel.mappedBy}")`);
    }

    const declaration = `${annotations.join('\n')}\n    private ${targetType} ${fieldName};`;
    const getterSetter = `    public ${targetType} get${pascalName}() {
        return this.${fieldName};
    }

    public void set${pascalName}(${targetType} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`;

    return { declaration, getterSetter, imports };
  }

  if (rel.annotation === 'ManyToOne') {
    imports.push(
      'jakarta.persistence.ManyToOne',
      'jakarta.persistence.FetchType',
      'jakarta.persistence.JoinColumn',
    );
    annotations.push(
      `    @ManyToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = "${rel.joinColumnName}")`,
    );

    const declaration = `${annotations.join('\n')}\n    private ${targetType} ${fieldName};`;
    const getterSetter = `    public ${targetType} get${pascalName}() {
        return this.${fieldName};
    }

    public void set${pascalName}(${targetType} ${fieldName}) {
        this.${fieldName} = ${fieldName};
    }`;

    return { declaration, getterSetter, imports };
  }

  if (rel.annotation === 'OneToMany') {
    imports.push('jakarta.persistence.OneToMany', 'java.util.List', 'java.util.ArrayList');
    if (rel.isCascadeAll) {
      imports.push('jakarta.persistence.CascadeType');
      annotations.push(
        `    @OneToMany(mappedBy = "${rel.mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)`,
      );
    } else {
      annotations.push(`    @OneToMany(mappedBy = "${rel.mappedBy}")`);
    }

    const declaration = `${annotations.join('\n')}\n    private List<${targetType}> ${fieldName} = new ArrayList<>();`;
    const getterSetter = `    public List<${targetType}> get${pascalName}() {
        return this.${fieldName};
    }

    public void set${pascalName}(List<${targetType}> ${fieldName}) {
        this.${fieldName} = ${fieldName} != null ? ${fieldName} : new ArrayList<>();
    }`;

    return { declaration, getterSetter, imports };
  }

  // ManyToMany
  imports.push('jakarta.persistence.ManyToMany', 'java.util.List', 'java.util.ArrayList');
  if (rel.isOwningSide) {
    imports.push('jakarta.persistence.JoinTable', 'jakarta.persistence.JoinColumn');
    annotations.push(
      `    @ManyToMany\n    @JoinTable(name = "${rel.joinTableName}", joinColumns = @JoinColumn(name = "${rel.joinColumnName}"), inverseJoinColumns = @JoinColumn(name = "${rel.inverseJoinColumnName}"))`,
    );
  } else {
    annotations.push(`    @ManyToMany(mappedBy = "${rel.mappedBy}")`);
  }

  const declaration = `${annotations.join('\n')}\n    private List<${targetType}> ${fieldName} = new ArrayList<>();`;
  const getterSetter = `    public List<${targetType}> get${pascalName}() {
        return this.${fieldName};
    }

    public void set${pascalName}(List<${targetType}> ${fieldName}) {
        this.${fieldName} = ${fieldName} != null ? ${fieldName} : new ArrayList<>();
    }`;

  return { declaration, getterSetter, imports };
}
