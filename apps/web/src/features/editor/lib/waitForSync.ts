/** Lo minimo del proveedor de colaboracion que hace falta para esperar. */
export interface SyncSource {
  readonly isSynced: boolean;
  readonly hasUnsyncedChanges: boolean;
}

/**
 * Espera a que el servidor tenga todos los cambios locales. Lo que lee el
 * servidor (generar el backend, la IA del chat) usa el documento compartido, y
 * un cambio hecho medio segundo antes podia no haber llegado aun: se generaba
 * sin la ultima clase (ADR 0042). Devuelve false si se agota el plazo.
 */
export async function waitForSync(
  source: SyncSource | null,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<boolean> {
  if (source === null) {
    return true;
  }
  const deadline = Date.now() + timeoutMs;
  while (!source.isSynced || source.hasUnsyncedChanges) {
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return true;
}
