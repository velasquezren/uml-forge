/** Datos de version que UML Forge deja en su propia extension del XMI. */
export interface XmiVersionInfo {
  readonly revision: number;
  readonly modelId: string | null;
  readonly updatedAt: string | null;
}

/**
 * Lee la revision con la que se exporto un fichero de UML Forge, sin parsear el
 * documento completo. Devuelve null si el fichero viene de otra herramienta.
 */
export function readXmiVersion(xmlContent: string): XmiVersionInfo | null {
  const tag = /<modelVersion\b[^>]*\/?>/u.exec(xmlContent)?.[0];
  if (tag === undefined) {
    return null;
  }
  const read = (name: string): string | null =>
    new RegExp(`\\b${name}="([^"]*)"`, 'u').exec(tag)?.[1] ?? null;

  const revision = Number(read('revision'));
  return {
    revision: Number.isInteger(revision) && revision >= 0 ? revision : 0,
    modelId: read('modelId'),
    updatedAt: read('updatedAt'),
  };
}
