import { useState, useMemo, useCallback } from 'react';
import { createFileRoute, Navigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createId, type UMLRelationship, type UmlOperationInput } from '@uml-forge/uml-core';
import { EditorLayout } from '@/layouts/EditorLayout';
import { EditorCanvas, type EditorCanvasHandlers } from '@/features/editor/EditorCanvas';
import { Palette } from '@/features/editor/components/Palette';
import { ModelTree } from '@/features/editor/components/ModelTree';
import { PropertyInspector } from '@/features/editor/components/PropertyInspector';
import { SyncStatusBadge } from '@/features/sync/SyncStatusBadge';
import { useOutboxSync } from '@/features/sync/useOutboxSync';
import { XmiActions } from '@/features/xmi/XmiActions';
import { resolveSelection } from '@/features/editor/lib/selection';
import type { SelectedElement } from '@/features/editor/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiClient, type ProjectDto } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/projects/$projectId/editor')({
  component: ProjectEditorPage,
});

function ProjectEditorPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/editor' });
  const [selectedRef, setSelectedRef] = useState<SelectedElement | null>(null);
  const [relationshipKind, setRelationshipKind] = useState<UMLRelationship['kind']>('association');
  const [canvas, setCanvas] = useState<EditorCanvasHandlers | null>(null);

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
      canvas?.applyOperation(op);
    },
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.get(`projects/${projectId}`).json<ProjectDto>(),
    enabled: isAuthenticated,
  });

  const handleApplyOperation = useCallback(
    (op: UmlOperationInput) => {
      canvas?.applyOperation(op);
      // Si estamos desconectados, encolamos en IndexedDB Outbox
      if (!isOnline) {
        void queueOperation(op);
      }
    },
    [canvas, isOnline, queueOperation],
  );

  // El lienzo publica sus manejadores en cada render util; se guarda tal cual
  // porque el objeto solo cambia cuando cambia el modelo o el historial.
  const handleInitModelHandler = useCallback((handlers: EditorCanvasHandlers) => {
    setCanvas(handlers);
  }, []);

  const model = canvas?.model ?? null;

  // El inspector y el arbol siempre leen la version viva del elemento, nunca la
  // copia congelada en el momento de seleccionarlo.
  const selectedElement = useMemo(() => resolveSelection(model, selectedRef), [model, selectedRef]);

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

  return (
    <EditorLayout
      projectId={projectId}
      projectName={project?.name}
      onUndo={canvas?.undo}
      onRedo={canvas?.redo}
      canUndo={canvas?.canUndo ?? false}
      canRedo={canvas?.canRedo ?? false}
      onlineUsersCount={(canvas?.remoteUsers.length ?? 0) + 1}
      actionsContent={
        <XmiActions model={model} onReplaceModel={(imported) => canvas?.replaceModel(imported)} />
      }
      paletteContent={
        <Palette
          onApplyOperation={handleApplyOperation}
          relationshipKind={relationshipKind}
          onRelationshipKindChange={setRelationshipKind}
        />
      }
      treeContent={
        <ModelTree
          model={model}
          selectedElement={selectedElement}
          onSelectElement={setSelectedRef}
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
        key={projectId}
        projectId={projectId}
        projectName={project?.name}
        accessToken={accessToken}
        user={user}
        selectedElement={selectedElement}
        relationshipKind={relationshipKind}
        onSelectElement={setSelectedRef}
        onInitModelHandler={handleInitModelHandler}
      />
    </EditorLayout>
  );
}
