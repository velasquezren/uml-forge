import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';

/** Resultado estructurado retornado por los proveedores de IA. */
export interface AiGenerationResult {
  readonly explanation: string;
  readonly operations: readonly UmlOperation[];
}

/** Mensaje anterior de la conversacion, tal como lo ve la IA. */
export interface AiChatTurn {
  readonly author: string;
  readonly fromAssistant: boolean;
  readonly content: string;
}

/** Imagen o nota de voz que acompanna al mensaje que hay que responder. */
export interface AiChatAttachment {
  readonly kind: 'image' | 'audio';
  readonly mimeType: string;
  readonly data: Buffer;
}

/** Texto parcial de la respuesta, para mostrarla mientras se escribe. */
export type AiDraftListener = (draft: string) => void;

/** Peticion al chat de grupo: quien pregunta, que pregunta y el contexto. */
export interface AiChatRequest {
  readonly askedBy: string;
  readonly message: string;
  /** Conversacion reciente, de la mas antigua a la mas reciente. */
  readonly history: readonly AiChatTurn[];
  /** Personas conectadas al proyecto en este momento. */
  readonly participants: readonly string[];
  readonly model?: UMLModel;
  /** Adjunto del mensaje; la IA lo ve u oye directamente (ADR 0044). */
  readonly attachment?: AiChatAttachment;
  /** Transcripcion de la nota de voz adjunta, si la hay. */
  readonly transcript?: string;
}

/** Respuesta del chat: texto para todos y, si se pidio un cambio, una propuesta. */
export interface AiChatReply {
  readonly reply: string;
  readonly proposal: AiGenerationResult | null;
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

  /**
   * Responde en el chat de grupo del proyecto (ADR 0042). Si el proveedor puede
   * escribir en directo, va avisando del texto parcial por `onDraft`.
   */
  converse(request: AiChatRequest, onDraft?: AiDraftListener): Promise<AiChatReply>;

  /** Transcribe una nota de voz; lanza un error si el proveedor no oye audio. */
  transcribe(audio: Buffer, mimeType: string): Promise<string>;

  /** Comprueba si el proveedor esta configurado y disponible para responder. */
  isAvailable(): Promise<boolean>;
}
