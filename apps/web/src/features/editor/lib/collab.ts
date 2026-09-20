/** Puerto de la API cuando se trabaja con `pnpm dev`, en otro origen que la PWA. */
const DEV_COLLAB_PORT = 3000;
const COLLAB_PATH = '/collab';

/** Colores de presencia. Uno por usuario, estable entre sesiones. */
const USER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'] as const;

/**
 * URL del servidor de colaboracion, respetando el esquema seguro de la pagina.
 *
 * En desarrollo la API vive en otro puerto. En la imagen de produccion la sirve
 * el mismo origen a traves de Nginx, de modo que fijar el puerto 3000 dejaria
 * la colaboracion sin conexion. `VITE_COLLAB_URL` permite apuntar a otro sitio.
 */
export function collabWebSocketUrl(): string {
  const configured = import.meta.env.VITE_COLLAB_URL;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = import.meta.env.DEV
    ? `:${DEV_COLLAB_PORT}`
    : window.location.port
      ? `:${window.location.port}`
      : '';

  return `${protocol}//${window.location.hostname}${port}${COLLAB_PATH}`;
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
