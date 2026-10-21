/**
 * El contador de revisiones vive en `uml-core` porque lo escriben tanto el
 * lienzo como el servidor cuando aplica una propuesta del chat (ADR 0042).
 */
export { bumpRevision, readRevision, ROOT_VERSIONING } from '@uml-forge/uml-core';
