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

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
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
          if (!isRefreshing) {
            isRefreshing = true;

            try {
              const refreshResponse = await ky
                .post('/api/auth/refresh', { credentials: 'include' })
                .json<AuthResponse>();

              useAuthStore.getState().setAuth(refreshResponse.user, refreshResponse.accessToken);
              onRefreshed(refreshResponse.accessToken);

              request.headers.set('Authorization', `Bearer ${refreshResponse.accessToken}`);
              return ky(request, options);
            } catch (err) {
              onRefreshed(null);
              useAuthStore.getState().clearAuth();
              throw err;
            } finally {
              isRefreshing = false;
            }
          }

          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              if (newToken) {
                request.headers.set('Authorization', `Bearer ${newToken}`);
                resolve(ky(request, options));
              } else {
                reject(new Error('Sesion expirada'));
              }
            });
          });
        }

        return response;
      },
    ],
  },
});
