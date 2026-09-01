import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  storagePersisted: boolean | null;
  setAuth: (user: UserProfile, token: string) => void;
  clearAuth: () => void;
  setInitializing: (isInitializing: boolean) => void;
  setStoragePersisted: (persisted: boolean) => void;
}

// El access token vive estrictamente en memoria (ADR 0013 / Regla de seguridad).
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  storagePersisted: null,
  setAuth: (user, token) =>
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isInitializing: false,
    }),
  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
    }),
  setInitializing: (isInitializing) => set({ isInitializing }),
  setStoragePersisted: (storagePersisted) => set({ storagePersisted }),
}));
