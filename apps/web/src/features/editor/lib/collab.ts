/** Puerto en el que la API expone el servidor Hocuspocus embebido. */
const COLLAB_PORT = 3000;
const COLLAB_PATH = '/collab';

/** Colores de presencia. Uno por usuario, estable entre sesiones. */
const USER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'] as const;

/** URL del servidor de colaboracion, respetando el esquema seguro de la pagina. */
export function collabWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:${COLLAB_PORT}${COLLAB_PATH}`;
}

/**
 * Color de presencia derivado del identificador del usuario. Al ser una funcion
 * del identificador, todos los participantes ven el mismo color para la misma
 * persona sin necesidad de acordarlo por la red.
 */
export function colorForUser(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = userId.charCodeAt(index) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length] ?? USER_COLORS[0];
}
