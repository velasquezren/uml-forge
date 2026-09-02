import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import {
  applyOperationToYDoc,
  createEmptyModel,
  fromYDoc,
  hasModel,
  writeModel,
  ROOT_CLASSES,
  ROOT_ENUMS,
  ROOT_META,
  ROOT_RELATIONSHIPS,
  type UMLModel,
  type UmlOperationInput,
} from '@uml-forge/uml-core';
import { modelToEdges, modelToNodes } from '../lib/flowMapper';
import { collabWebSocketUrl, colorForUser } from '../lib/collab';
import type { UmlEdge, UmlNode, UserAwarenessState } from '../types';

interface UseYjsModelOptions {
  projectId: string;
  projectName?: string;
  accessToken: string | null;
  user: { id: string; name: string } | null;
}

/**
 * Hook de colaboracion del lienzo. La fuente de verdad es siempre el `Y.Doc`:
 * el estado de React se deriva de el mediante `observeDeep` y toda edicion pasa
 * por `applyOperationToYDoc`, nunca por mutacion directa desde los componentes.
 */
export function useYjsModel({
  projectId,
  projectName = 'Proyecto UML',
  accessToken,
  user,
}: UseYjsModelOptions) {
  // Un documento por montaje. Cambiar de proyecto remonta el lienzo (lleva
  // `key={projectId}`), asi que aqui no hace falta reaccionar al identificador.
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [model, setModel] = useState<UMLModel | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [remoteUsers, setRemoteUsers] = useState<UserAwarenessState[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<UserAwarenessState[]>([]);
  // Firma de los participantes: evita rehacer la presencia en cada movimiento
  // del raton ajeno, que llega hasta dieciseis veces por segundo y usuario.
  const remoteSignatureRef = useRef('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  // Deriva el estado de React exclusivamente a partir de Y.Doc
  const syncFromYDoc = useCallback(() => {
    if (!hasModel(ydoc)) {
      return;
    }
    const result = fromYDoc(ydoc);
    if (result.ok) {
      setModel(result.value);
    }
  }, [ydoc]);

  /** Crea el modelo vacio la primera vez que se abre un proyecto sin contenido. */
  const ensureModel = useCallback(() => {
    if (!hasModel(ydoc)) {
      writeModel(ydoc, createEmptyModel(projectName, { id: projectId }));
    }
  }, [ydoc, projectId, projectName]);

  // Historial local de deshacer y rehacer sobre las cuatro raices del documento.
  useEffect(() => {
    const undoManager = new Y.UndoManager(
      [
        ydoc.getMap(ROOT_CLASSES),
        ydoc.getMap(ROOT_ENUMS),
        ydoc.getMap(ROOT_RELATIONSHIPS),
        ydoc.getMap(ROOT_META),
      ],
      { captureTimeout: 400 },
    );
    undoManagerRef.current = undoManager;

    const refreshHistory = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };

    undoManager.on('stack-item-added', refreshHistory);
    undoManager.on('stack-item-popped', refreshHistory);
    undoManager.on('stack-cleared', refreshHistory);

    return () => {
      undoManager.destroy();
      undoManagerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };
  }, [ydoc]);

  useEffect(() => {
    // 1. Persistencia local con IndexeddbPersistence (y-indexeddb)
    const idbPersistence = new IndexeddbPersistence(projectId, ydoc);
    idbPersistence.on('synced', () => {
      syncFromYDoc();
    });

    // Observa cualquier cambio profundo en el YDoc, venga de donde venga
    const roots = [ROOT_CLASSES, ROOT_ENUMS, ROOT_RELATIONSHIPS, ROOT_META].map((key) =>
      ydoc.getMap(key),
    );
    const observer = () => syncFromYDoc();
    for (const root of roots) {
      root.observeDeep(observer);
    }

    const detach = () => {
      for (const root of roots) {
        root.unobserveDeep(observer);
      }
      void idbPersistence.destroy();
    };

    // Sin sesion no hay servidor de colaboracion: el lienzo trabaja en local
    if (!accessToken) {
      idbPersistence.whenSynced.then(ensureModel).catch(() => undefined);
      setStatus('disconnected');
      return detach;
    }

    // 2. Proveedor WebSocket Hocuspocus
    const provider = new HocuspocusProvider({
      url: collabWebSocketUrl(),
      name: projectId,
      document: ydoc,
      token: accessToken,
      onStatus: (event) => {
        setStatus(event.status);
      },
      onSynced: () => {
        // Solo tras sincronizar con el servidor se sabe si el proyecto ya tenia
        // modelo: crearlo antes duplicaria el contenido al reconectar.
        ensureModel();
        syncFromYDoc();
      },
    });

    providerRef.current = provider;

    provider.setAwarenessField('user', {
      id: user?.id ?? 'anon',
      name: user?.name ?? 'Usuario',
      color: colorForUser(user?.id ?? 'anon'),
    });

    const handleAwarenessChange = () => {
      const awareness = provider.awareness;
      if (!awareness) return;
      const states = Array.from(awareness.getStates().values()) as UserAwarenessState[];
      const others = states.filter((state) => state.user && state.user.id !== user?.id);

      setRemoteCursors(others);

      const signature = others
        .map((state) => `${state.user.id}:${state.user.name}:${state.user.color}`)
        .join('|');
      if (signature !== remoteSignatureRef.current) {
        remoteSignatureRef.current = signature;
        setRemoteUsers(others.map((state) => ({ user: state.user })));
      }
    };

    provider.awareness?.on('change', handleAwarenessChange);
    syncFromYDoc();

    return () => {
      provider.awareness?.off('change', handleAwarenessChange);
      provider.destroy();
      providerRef.current = null;
      detach();
    };
  }, [projectId, accessToken, user, ydoc, syncFromYDoc, ensureModel]);

  const applyOperation = useCallback(
    (op: UmlOperationInput) => {
      ensureModel();
      const result = applyOperationToYDoc(ydoc, op);
      if (result.ok) {
        setModel(result.value);
      }
      return result;
    },
    [ydoc, ensureModel],
  );

  const updatePosition = useCallback(
    (classifierId: string, position: { x: number; y: number }) => {
      applyOperation({ type: 'setPosition', classId: classifierId, position });
    },
    [applyOperation],
  );

  /**
   * Sustituye por completo el contenido del modelo, conservando su identidad.
   * Lo usa la importacion XMI: se escribe sobre el CRDT para que el reemplazo
   * viaje a los demas participantes y sobreviva a una recarga.
   */
  const replaceModel = useCallback(
    (imported: UMLModel) => {
      const current = fromYDoc(ydoc);
      writeModel(ydoc, {
        ...imported,
        id: current.ok ? current.value.id : imported.id,
        name: current.ok ? current.value.name : imported.name,
        createdAt: current.ok ? current.value.createdAt : imported.createdAt,
        updatedAt: new Date().toISOString(),
      });
      syncFromYDoc();
    },
    [ydoc, syncFromYDoc],
  );

  /**
   * Publica la posicion del puntero en coordenadas del lienzo. Viaja por el
   * canal de awareness, no por el CRDT: es informacion volatil de sesion que no
   * debe quedar en el historial ni persistirse con el modelo.
   */
  const publishCursor = useCallback((position: { x: number; y: number } | null) => {
    providerRef.current?.setAwarenessField('cursor', position ?? undefined);
  }, []);

  const undo = useCallback(() => undoManagerRef.current?.undo(), []);
  const redo = useCallback(() => undoManagerRef.current?.redo(), []);

  const nodes: UmlNode[] = useMemo(() => (model ? modelToNodes(model) : []), [model]);
  const edges: UmlEdge[] = useMemo(() => (model ? modelToEdges(model) : []), [model]);

  return {
    ydoc,
    model,
    nodes,
    edges,
    status,
    remoteUsers,
    remoteCursors,
    applyOperation,
    updatePosition,
    publishCursor,
    replaceModel,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
