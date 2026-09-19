import ky from 'ky';
import { useAuthStore, type UserProfile } from '../stores/auth.store';

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner?: UserProfile;
  currentUserRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
  members?: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER';
    user: UserProfile;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

let pendingRefresh: Promise<AuthResponse> | null = null;

/** El arranque y los 401 comparten una sola rotacion de la cookie. */
export function refreshSession(): Promise<AuthResponse> {
  if (!pendingRefresh) {
    const previousToken = useAuthStore.getState().accessToken;
    pendingRefresh = ky
      .post(new URL('/api/auth/refresh', window.location.origin), {
        credentials: 'include',
        retry: 0,
      })
      .json<AuthResponse>()
      .then((session) => {
        if (useAuthStore.getState().accessToken === previousToken) {
          useAuthStore.getState().setAuth(session.user, session.accessToken);
        }
        return session;
      })
      .catch((error: unknown) => {
        if (useAuthStore.getState().accessToken === previousToken) {
          useAuthStore.getState().clearAuth();
        }
        throw error;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
}

export const apiClient = ky.create({
  prefixUrl: '/api',
  credentials: 'include',
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        const isAuthUrl =
          request.url.includes('/auth/login') ||
          request.url.includes('/auth/register') ||
          request.url.includes('/auth/refresh');

        if (response.status === 401 && !isAuthUrl) {
          const currentToken = useAuthStore.getState().accessToken;
          if (!currentToken || request.headers.get('Authorization') === `Bearer ${currentToken}`) {
            await refreshSession();
          }
          const token = useAuthStore.getState().accessToken;
          if (!token) {
            return response;
          }
          request.headers.set('Authorization', `Bearer ${token}`);
          // Un segundo 401 se devuelve: no iniciar un bucle de renovaciones.
          return ky(request, {
            ...options,
            headers: request.headers,
            hooks: { beforeRequest: [], afterResponse: [] },
          });
        }

        return response;
      },
    ],
  },
});
