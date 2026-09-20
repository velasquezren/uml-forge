import { createFileRoute, Navigate, useParams } from '@tanstack/react-router';
import { AppShell } from '@/layouts/AppShell';
import { ProjectSettings } from '@/features/projects/ProjectSettings';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/projects/$projectId/settings')({
  component: ProjectSettingsPage,
});

function ProjectSettingsPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/settings' });
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
      <ProjectSettings projectId={projectId} />
    </AppShell>
  );
}
