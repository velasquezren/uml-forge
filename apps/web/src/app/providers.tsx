import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from './queryClient';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient, type AuthResponse } from '@/lib/api';
import { requestPersistentStorage } from '@/lib/storage';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setStoragePersisted = useAuthStore((s) => s.setStoragePersisted);

  useEffect(() => {
    async function initSession() {
      try {
        const authData = await apiClient.post('auth/refresh').json<AuthResponse>();
        setAuth(authData.user, authData.accessToken);

        const { persisted } = await requestPersistentStorage();
        setStoragePersisted(persisted);
      } catch {
        clearAuth();
      }
    }

    void initSession();
  }, [setAuth, clearAuth, setStoragePersisted]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
