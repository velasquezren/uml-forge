/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Reclamo inmediato de clientes al activar
void self.skipWaiting();
clientsClaim();

// Precache del shell de la aplicacion
precacheAndRoute(self.__WB_MANIFEST);

// CacheFirst para fuentes y recursos estaticos pesados
registerRoute(
  ({ request }: { request: Request }) =>
    request.destination === 'font' || request.destination === 'image',
  new CacheFirst({
    cacheName: 'uml-forge-static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  }),
);

// NetworkFirst para peticiones GET a la API REST (/api/*) con fallback a cache
registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'uml-forge-api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
      }),
    ],
  }),
);
