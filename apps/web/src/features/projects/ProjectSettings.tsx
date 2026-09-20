import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient, type ProjectDto } from '@/lib/api';
import { ProjectBasicInfoForm, type UpdateProjectFormData } from './ProjectBasicInfoForm';
import { ProjectMembersTable, type AddMemberFormData } from './ProjectMembersTable';
import { ProjectDangerZone } from './ProjectDangerZone';

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.get(`projects/${projectId}`).json<ProjectDto>(),
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateProjectFormData) =>
      apiClient.patch(`projects/${projectId}`, { json: values }).json<ProjectDto>(),
    onSuccess: () => {
      toast.success('Proyecto actualizado correctamente');
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      toast.error('No se pudo actualizar el proyecto');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (values: AddMemberFormData) =>
      apiClient.post(`projects/${projectId}/members`, { json: values }).json(),
    onSuccess: () => {
      toast.success('Miembro anadido con exito');
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: () => {
      toast.error(
        'No se pudo anadir el miembro (verifica que el usuario exista y no sea ya miembro)',
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`projects/${projectId}/members/${userId}`).json(),
    onSuccess: () => {
      toast.success('Miembro eliminado');
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: () => {
      toast.error('No se pudo eliminar el miembro');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }) =>
      apiClient.patch(`projects/${projectId}/members/${userId}`, { json: { role } }).json(),
    onSuccess: () => {
      toast.success('Rol de miembro actualizado');
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: () => {
      toast.error('No se pudo actualizar el rol');
    },
  });

  const handleDeleteProject = async () => {
    if (!confirm('Estas seguro de eliminar este proyecto de forma permanente?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.delete(`projects/${projectId}`);
      toast.success('Proyecto eliminado');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void navigate({ to: '/projects' });
    } catch {
      toast.error('No se pudo eliminar el proyecto');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Cargando ajustes del proyecto...</div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8 text-center text-destructive">
        Error al cargar los ajustes del proyecto o permisos insuficientes.
      </div>
    );
  }

  const isOwner = project.currentUserRole === 'OWNER';
  const canEdit = isOwner || project.currentUserRole === 'EDITOR';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes de {project.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura los detalles del modelo UML y los permisos de colaboracion.
        </p>
      </div>

      <ProjectBasicInfoForm
        project={project}
        canEdit={canEdit}
        isSaving={updateMutation.isPending}
        onSave={(values) => updateMutation.mutate(values)}
      />

      <ProjectMembersTable
        project={project}
        isOwner={isOwner}
        isAddingMember={addMemberMutation.isPending}
        onAddMember={(values) => addMemberMutation.mutate(values)}
        onUpdateRole={(userId, role) => updateRoleMutation.mutate({ userId, role })}
        onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
      />

      {isOwner && (
        <ProjectDangerZone
          isDeleting={isDeleting}
          onDeleteProject={() => void handleDeleteProject()}
        />
      )}
    </div>
  );
}
