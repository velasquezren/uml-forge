import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Clock, FolderKanban, Settings, Shield, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiClient, type ProjectDto } from '@/lib/api';
import { CreateProjectDialog } from './CreateProjectDialog';

export function ProjectList() {
  const queryClient = useQueryClient();

  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('projects').json<ProjectDto[]>(),
  });

  const handleProjectCreated = () => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-36 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <FolderKanban className="h-12 w-12 text-destructive mb-3" />
        <h3 className="text-lg font-semibold text-destructive">Error al cargar proyectos</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          No se pudo conectar con el servidor para obtener los proyectos.
        </p>
        <Button
          variant="outline"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['projects'] })}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mis Proyectos UML
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona y colabora en tiempo real en tus diagramas de clases.
          </p>
        </div>

        <CreateProjectDialog onProjectCreated={handleProjectCreated} />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No tienes proyectos aun</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
            Comienza creando tu primer modelo de clases UML o colabora con otros desarrolladores.
          </p>
          <CreateProjectDialog onProjectCreated={handleProjectCreated} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const roleLabels: Record<string, string> = {
              OWNER: 'Propietario',
              EDITOR: 'Editor',
              VIEWER: 'Lector',
            };

            const role = project.currentUserRole || 'VIEWER';

            return (
              <Card
                key={project.id}
                className="flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold truncate tracking-tight">
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center space-x-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      <Shield className="h-3 w-3" />
                      <span>{roleLabels[role] || role}</span>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[40px] text-xs">
                    {project.description || 'Sin descripcion adicional.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex items-center text-xs text-muted-foreground space-x-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Actualizado el {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border/50 pt-3">
                  <Link to="/projects/$projectId/settings" params={{ projectId: project.id }}>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
                      <Settings className="h-3.5 w-3.5" />
                      <span>Ajustes</span>
                    </Button>
                  </Link>

                  <Link to="/projects/$projectId/editor" params={{ projectId: project.id }}>
                    <Button size="sm" className="h-8 px-3 text-xs">
                      Abrir Editor
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
