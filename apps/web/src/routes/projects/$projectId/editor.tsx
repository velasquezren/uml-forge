import { useState, useMemo } from 'react';
import { createFileRoute, Navigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createId, type UMLModel, type UmlOperationInput } from '@uml-forge/uml-core';
import { EditorLayout } from '@/layouts/EditorLayout';
import { EditorCanvas } from '@/features/editor/EditorCanvas';
import { Palette } from '@/features/editor/components/Palette';
import { ModelTree } from '@/features/editor/components/ModelTree';
import { PropertyInspector } from '@/features/editor/components/PropertyInspector';
import { SyncStatusBadge } from '@/features/sync/SyncStatusBadge';
import { useOutboxSync } from '@/features/sync/useOutboxSync';
import type { SelectedElement } from '@/features/editor/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiClient, type ProjectDto } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/projects/$projectId/editor')({
  component: ProjectEditorPage,
});

function ProjectEditorPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/editor' });
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [modelState, setModelState] = useState<UMLModel | null>(null);
  const [operationHandler, setOperationHandler] = useState<{
    apply: (op: UmlOperationInput) => void;
  } | null>(null);

  const clientId = useMemo(() => createId(), []);
  const isOnline = useNetworkStatus();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { pendingCount, isSyncing, drainOutbox, queueOperation } = useOutboxSync({
    projectId,
    clientId,
    onOperationApplied: (op) => {
      if (operationHandler) {
        operationHandler.apply(op);
      }
    },
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.get(`projects/${projectId}`).json<ProjectDto>(),
    enabled: isAuthenticated,
  });

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Cargando editor...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const handleApplyOperation = (op: UmlOperationInput) => {
    if (operationHandler) {
      operationHandler.apply(op);
    }
    // Si estamos desconectados, encolamos en IndexedDB Outbox
    if (!isOnline) {
      void queueOperation(op);
    }
  };

  const handleInitModelHandler = (handlers: {
    applyOperation: (op: UmlOperationInput) => unknown;
    model: UMLModel | null;
  }) => {
    setModelState(handlers.model);
    setOperationHandler({ apply: handlers.applyOperation });
  };

  return (
    <EditorLayout
      projectId={projectId}
      projectName={project?.name}
      paletteContent={<Palette onApplyOperation={handleApplyOperation} />}
      treeContent={
        <ModelTree
          model={modelState}
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          onApplyOperation={handleApplyOperation}
        />
      }
      inspectorContent={
        <PropertyInspector
          selectedElement={selectedElement}
          onApplyOperation={handleApplyOperation}
        />
      }
      syncStatusContent={
        <SyncStatusBadge
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onManualSync={() => void drainOutbox()}
        />
      }
    >
      <EditorCanvas
        projectId={projectId}
        projectName={project?.name}
        accessToken={accessToken}
        user={user}
        selectedElement={selectedElement}
        onSelectElement={setSelectedElement}
        onInitModelHandler={handleInitModelHandler}
      />
    </EditorLayout>
  );
}
