import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, refreshSession } from './api';
import { useAuthStore } from '../stores/auth.store';

const user = {
  id: 'user-1',
  email: 'demo@example.com',
  name: 'Demo',
  createdAt: '',
  updatedAt: '',
};
const client = apiClient.extend({ prefixUrl: 'http://localhost/api', retry: 0 });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('renovacion de sesion', () => {
  beforeEach(() => useAuthStore.getState().setAuth(user, 'expired'));
  afterEach(() => vi.unstubAllGlobals());

  it('comparte la renovacion entre el arranque y solicitudes concurrentes', async () => {
    let finishRefresh!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => {
      finishRefresh = resolve;
    });
    let refreshCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((request: Request) => {
        if (request.url.endsWith('/auth/refresh')) {
          refreshCalls += 1;
          return refresh;
        }
        return Promise.resolve(
          request.headers.get('Authorization') === 'Bearer renewed'
            ? json({ available: true })
            : json({}, 401),
        );
      }),
    );
    const startup = refreshSession();
    const requests = [client.get('ai/status').json(), client.get('projects').json()];
    finishRefresh(json({ user, accessToken: 'renewed' }));
    await startup;
    await expect(Promise.all(requests)).resolves.toEqual([
      { available: true },
      { available: true },
    ]);
    expect(refreshCalls).toBe(1);
  });

  it('reintenta el POST con el token nuevo y conserva su contenido', async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        if (request.url.endsWith('/auth/refresh')) return json({ user, accessToken: 'renewed' });
        bodies.push(await request.clone().text());
        return request.headers.get('Authorization') === 'Bearer renewed'
          ? json({ operations: [] })
          : json({}, 401);
      }),
    );
    await expect(client.post('ai/generate', { json: { prompt: 'Libro' } }).json()).resolves.toEqual(
      { operations: [] },
    );
    expect(bodies).toEqual(['{"prompt":"Libro"}', '{"prompt":"Libro"}']);
  });

  it('no renueva indefinidamente si la peticion reintentada devuelve 401', async () => {
    const fetchMock = vi.fn((request: Request) =>
      Promise.resolve(
        request.url.endsWith('/auth/refresh')
          ? json({ user, accessToken: 'renewed' })
          : json({}, 401),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(client.get('ai/status')).rejects.toMatchObject({ response: { status: 401 } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('un refresco anterior fallido no borra un inicio de sesion posterior', async () => {
    let finishRefresh!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finishRefresh = resolve;
          }),
      ),
    );
    const result = refreshSession();
    await vi.waitFor(() => expect(finishRefresh).toBeDefined());
    useAuthStore.getState().setAuth(user, 'new-login');
    finishRefresh(json({}, 401));
    await expect(result).rejects.toMatchObject({ response: { status: 401 } });
    expect(useAuthStore.getState().accessToken).toBe('new-login');
  });
});
