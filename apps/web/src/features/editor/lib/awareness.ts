import type { UserAwarenessState } from '../types';

/**
 * Interpreta un estado de awareness ajeno. Llega sin tipar desde el proveedor,
 * asi que se comprueba antes de dejarlo entrar en el estado de React.
 */
export function toUserAwareness(state: Record<string, unknown>): UserAwarenessState | null {
  const rawUser = state.user;
  if (typeof rawUser !== 'object' || rawUser === null) {
    return null;
  }

  const { id, name, color } = rawUser as { id?: unknown; name?: unknown; color?: unknown };
  if (typeof id !== 'string' || typeof name !== 'string' || typeof color !== 'string') {
    return null;
  }

  const cursor = readCursor(state.cursor);
  // `editing` solo se incluye cuando es cierto: ausente equivale a no editar.
  const base: UserAwarenessState =
    state.editing === true
      ? { user: { id, name, color }, editing: true }
      : { user: { id, name, color } };
  return cursor === null ? base : { ...base, cursor };
}

/** Posicion del cursor, solo si trae dos coordenadas numericas. */
function readCursor(raw: unknown): { x: number; y: number } | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const { x, y } = raw as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
}

/** Firma de los participantes: cambia cuando entra o sale alguien, o empieza o deja de editar. */
export function presenceSignature(states: readonly UserAwarenessState[]): string {
  return states
    .map(
      (state) =>
        `${state.user.id}:${state.user.name}:${state.user.color}:${state.editing === true ? 'e' : ''}`,
    )
    .join('|');
}
