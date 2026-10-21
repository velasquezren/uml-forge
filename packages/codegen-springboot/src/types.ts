import type {
  UMLClass,
  UMLEnum,
  UMLModel,
  UMLOperation,
  UMLParameter,
  UMLProperty,
  UMLRelationship,
} from '@uml-forge/uml-core';

/** Opciones de configuracion para la generacion del proyecto Spring Boot. */
export interface CodegenOptions {
  readonly groupId: string;
  readonly artifactId: string;
  readonly packageName: string;
  /** Java 17 es el minimo de Spring Boot 3 y lo que mas se encuentra instalado. */
  readonly javaVersion: '17';
  readonly springBootVersion: string;
  readonly database: 'postgresql' | 'h2';
  readonly serverPort: number;
  readonly description: string;
  readonly applicationName: string;
}

/** Archivo individual generado en memoria. */
export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
  /** Script que debe conservar el permiso de ejecucion (`mvnw`). */
  readonly executable?: boolean;
}

/** Cardinalidad y rol de un extremo en el analisis de relaciones. */
export type MultiplicityKind = 'one' | 'optional' | 'many';

/** Rol de una relacion para una entidad JPA. */
export interface EntityRelationshipField {
  readonly relationshipId: string;
  readonly fieldName: string;
  readonly targetClassName: string;
  readonly isCollection: boolean;
  readonly annotation: 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany';
  readonly isOwningSide: boolean;
  readonly mappedBy?: string;
  readonly joinColumnName?: string;
  readonly joinTableName?: string;
  readonly inverseJoinColumnName?: string;
  readonly isComposition: boolean;
  readonly isCascadeAll: boolean;
}

/** Entidad JPA analizada lista para la generacion de codigo. */
export interface AnalyzedEntity {
  readonly umlClass: UMLClass;
  readonly javaClassName: string;
  readonly tableName: string;
  readonly isAbstract: boolean;
  readonly isInterface: boolean;
  readonly parentClassName?: string;
  readonly implementedInterfaces: string[];
  readonly hasSubclasses: boolean;
  readonly idProperty?: UMLProperty;
  readonly attributes: UMLProperty[];
  readonly operations: UMLOperation[];
  readonly relationships: EntityRelationshipField[];
}

/** Modelo UML analizado y normalizado. */
export interface AnalyzedModel {
  readonly rawModel: UMLModel;
  readonly options: CodegenOptions;
  readonly entities: Map<string, AnalyzedEntity>;
  readonly enums: Map<string, UMLEnum>;
  readonly interfaces: Map<string, UMLClass>;
}

export type {
  UMLClass,
  UMLEnum,
  UMLModel,
  UMLOperation,
  UMLParameter,
  UMLProperty,
  UMLRelationship,
};
