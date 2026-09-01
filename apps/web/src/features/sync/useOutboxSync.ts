import { useCallback, useEffect, useState } from 'react';
import { createId, type UmlOperationInput } from '@uml-forge/uml-core';
import { toast } from 'sonner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiClient } from '@/lib/api';
import {
  countPendingOperations,
  enqueueOperation,
  getPendingOperations,
  removeOperations,
} from './outbox';

export interface OperationResult {
  seq: number;
  status: 'applied' | 'skipped_duplicate' | 'conflict';
  opType: string;
  existingId?: string;
  reason?: string;
}

export interface SyncResponse {
  batchId: string;
  results: OperationResult[];
}

interface UseOutboxSyncOptions {
  projectId: string;
  clientId: string;
  onOperationApplied?: (op: UmlOperationInput) => void;
}

export function useOutboxSync({ projectId, clientId, onOperationApplied }: UseOutboxSyncOptions) {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResults, setLastResults] = useState<OperationResult[] | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await countPendingOperations(projectId);
      setPendingCount(count);
    } catch {
      // IndexedDB fallback
    }
  }, [projectId]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const drainOutbox = useCallback(async (): Promise<SyncResponse | null> => {
    if (!isOnline || isSyncing) {
      return null;
    }

    const pending = await getPendingOperations(projectId);
    if (pending.length === 0) {
      setPendingCount(0);
      return null;
    }

    setIsSyncing(true);
    const batchId = createId();

    try {
      const response = await apiClient
        .post(`projects/${projectId}/operations`, {
          json: {
            clientId,
            batchId,
            operations: pending.map((p) => ({
              seq: p.seq,
              op: p.op,
            })),
          },
        })
        .json<SyncResponse>();

      // Eliminar operaciones procesadas de IndexedDB
      await removeOperations(pending.map((p) => p.id));
      await refreshCount();
      setLastResults(response.results);

      // Notificar resultados al usuario
      const applied = response.results.filter((r) => r.status === 'applied').length;
      const skipped = response.results.filter((r) => r.status === 'skipped_duplicate').length;
      const conflicts = response.results.filter((r) => r.status === 'conflict').length;

      if (conflicts > 0) {
        toast.warning(
          `Sincronizacion completada con advertencias: ${applied} aplicadas, ${skipped} duplicados omitidos, ${conflicts} conflictos.`,
        );
      } else {
        toast.success(
          `Sincronizado con exito: ${applied} cambios aplicados${skipped > 0 ? `, ${skipped} duplicados omitidos` : ''}.`,
        );
      }

      return response;
    } catch {
      toast.error('Error al sincronizar operaciones pendientes con el servidor.');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, projectId, clientId, refreshCount]);

  // Al recuperar la conexion online, drena la cola automaticamente
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      void drainOutbox();
    }
  }, [isOnline, pendingCount, isSyncing, drainOutbox]);

  const queueOperation = useCallback(
    async (op: UmlOperationInput) => {
      await enqueueOperation(projectId, clientId, op);
      await refreshCount();
      onOperationApplied?.(op);
    },
    [projectId, clientId, refreshCount, onOperationApplied],
  );

  return {
    pendingCount,
    isSyncing,
    lastResults,
    queueOperation,
    drainOutbox,
    refreshCount,
  };
}
