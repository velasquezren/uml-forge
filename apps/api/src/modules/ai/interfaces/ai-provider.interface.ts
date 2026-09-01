import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';

/** Resultado estructurado retornado por los proveedores de IA. */
export interface AiGenerationResult {
  readonly explanation: string;
  readonly operations: readonly UmlOperation[];
}

/** Interfaz comun para todos los proveedores de inteligencia artificial en servidor. */
export interface AiProvider {
  readonly providerName: string;

  /** Genera operaciones del metamodelo UML a partir de una instruccion en lenguaje natural. */
  generateFromPrompt(prompt: string, currentModel?: UMLModel): Promise<AiGenerationResult>;

  /** Interpreta un boceto o diagrama en imagen y genera operaciones UML. */
  generateFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt?: string,
    currentModel?: UMLModel,
  ): Promise<AiGenerationResult>;

  /** Sugiere refinamientos y mejoras arquitectonicas sobre un modelo existente. */
  suggestRefinements(model: UMLModel, context?: string): Promise<AiGenerationResult>;

  /** Comprueba si el proveedor esta configurado y disponible para responder. */
  isAvailable(): Promise<boolean>;
}
