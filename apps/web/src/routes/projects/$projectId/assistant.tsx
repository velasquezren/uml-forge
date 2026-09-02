import { createFileRoute, Navigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AssistantLayout } from '@/layouts/AssistantLayout';
import { AiAssistantPanel } from '@/features/ai/AiAssistantPanel';
import { useYjsModel } from '@/features/editor/hooks/useYjsModel';
import { apiClient, type ProjectDto } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/projects/$projectId/assistant')({
  component: ProjectAssistantPage,
});

function ProjectAssistantPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/assistant' });
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.get(`projects/${projectId}`).json<ProjectDto>(),
    enabled: isAuthenticated,
  });

  // El asistente trabaja sobre el mismo documento Yjs que el lienzo: lo que
  // dicta un usuario aparece en el diagrama de los demas al instante.
  const { model, applyOperation } = useYjsModel({
    projectId,
    projectName: project?.name,
    accessToken,
    user,
  });

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando asistente...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <AssistantLayout
      projectId={projectId}
      projectName={project?.name}
      summaryContent={
        <section className="rounded-lg border border-border p-3 text-xs">
          <h2 className="mb-2 text-sm font-semibold">Modelo actual</h2>
          {model && model.classes.length > 0 ? (
            <ul className="space-y-1">
              {model.classes.map((umlClass) => (
                <li key={umlClass.id} className="flex justify-between gap-2">
                  <span className="font-medium">{umlClass.name}</span>
                  <span className="text-muted-foreground">
                    {umlClass.attributes.length} atributos, {umlClass.operations.length} metodos
                  </span>
                </li>
              ))}
              <li className="pt-1 text-muted-foreground">
                {model.enums.length} enumeraciones, {model.relationships.length} relaciones
              </li>
            </ul>
          ) : (
            <p className="text-muted-foreground">
              El modelo esta vacio. Dicta una descripcion del dominio para empezar.
            </p>
          )}
        </section>
      }
    >
      <AiAssistantPanel model={model} applyOperation={applyOperation} />
    </AssistantLayout>
  );
}
