import type { UserAwarenessState } from '../types';

/**
 * Tiempo sin cambios tras el cual se considera que alguien ha dejado de editar.
 * Es lo bastante largo para cubrir la pausa entre dos pulsaciones al escribir
 * un nombre y lo bastante corto para no bloquear la exportacion sin motivo.
 */
export const EDIT_IDLE_MS = 3000;

/** Estado del bloqueo de exportacion e importacion. */
export interface EditLock {
  readonly locked: boolean;
  /** Quien esta editando ahora mismo; "Tu" representa a la persona local. */
  readonly editors: readonly string[];
}

export const UNLOCKED: EditLock = { locked: false, editors: [] };

/** Calcula el bloqueo a partir de la actividad local y de la presencia ajena. */
export function computeEditLock(
  localEditing: boolean,
  remoteUsers: readonly UserAwarenessState[],
): EditLock {
  const editors = [
    ...(localEditing ? ['Tu'] : []),
    ...remoteUsers.filter((state) => state.editing === true).map((state) => state.user.name),
  ];
  return { locked: editors.length > 0, editors };
}

/** Frase para la interfaz: quien esta editando y por que se espera. */
export function describeEditLock(lock: EditLock): string {
  if (!lock.locked) {
    return '';
  }
  const [first, ...rest] = lock.editors;
  if (rest.length === 0) {
    return first === 'Tu'
      ? 'Estas editando el modelo'
      : `${first ?? 'Alguien'} esta editando el modelo`;
  }
  return `${lock.editors.slice(0, -1).join(', ')} y ${lock.editors.at(-1) ?? ''} estan editando el modelo`;
}
