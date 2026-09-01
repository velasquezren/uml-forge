import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/projects" />;
  }

  return <Navigate to="/login" />;
}
