import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from './queryClient';
import { useAuthStore } from '@/stores/auth.store';
import { refreshSession } from '@/lib/api';
import { requestPersistentStorage } from '@/lib/storage';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const setStoragePersisted = useAuthStore((s) => s.setStoragePersisted);

  useEffect(() => {
    async function initSession() {
      try {
        await refreshSession();

        const { persisted } = await requestPersistentStorage();
        setStoragePersisted(persisted);
      } catch {
        // refreshSession ya actualiza la sesion sin borrar un login posterior.
      }
    }

    void initSession();
  }, [setStoragePersisted]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
