import { createFileRoute, Navigate } from '@tanstack/react-router';
import { AppShell } from '@/layouts/AppShell';
import { ProjectList } from '@/features/projects/ProjectList';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Cargando sesion...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <AppShell>
      <ProjectList />
    </AppShell>
  );
}
