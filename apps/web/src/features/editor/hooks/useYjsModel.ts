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
import { presenceSignature, toUserAwareness } from '../lib/awareness';
import { modelToEdges, modelToNodes } from '../lib/flowMapper';
import { collabWebSocketUrl, colorForUser } from '../lib/collab';
import type { UmlEdge, UmlNode, UserAwarenessState } from '../types';
import { useEditActivity } from './useEditActivity';
import { useModelRevision } from './useModelRevision';
import { useUndoHistory } from './useUndoHistory';

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
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const { isEditing, markEditing } = useEditActivity((editing) => {
    providerRef.current?.setAwarenessField('editing', editing);
  });
  const { revision, bumpRevision } = useModelRevision(ydoc);
  // Deshacer y rehacer tambien son cambios: nueva revision y actividad de edicion.
  const { canUndo, canRedo, undo, redo } = useUndoHistory(ydoc, () => {
    bumpRevision();
    markEditing();
  });

  const projectNameRef = useRef(projectName);
  projectNameRef.current = projectName;
  const userRef = useRef(user);
  userRef.current = user;

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
      writeModel(ydoc, createEmptyModel(projectNameRef.current, { id: projectId }));
    }
  }, [ydoc, projectId]);

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

    const publishIdentity = () => {
      const currentUser = userRef.current;
      provider.setAwarenessField('user', {
        id: currentUser?.id ?? 'anon',
        name: currentUser?.name ?? 'Usuario',
        color: colorForUser(currentUser?.id ?? 'anon'),
      });
    };

    /**
     * La presencia se toma de los eventos del proveedor y no del objeto
     * `awareness`: escuchando directamente en el objeto, quien ya estaba en el
     * lienzo no se enteraba de que entraba alguien nuevo.
     */
    const applyAwareness = (states: readonly { clientId: number }[]) => {
      const currentUserId = userRef.current?.id;
      const others = (states as readonly Record<string, unknown>[])
        .map((state) => toUserAwareness(state))
        .filter(
          (state): state is UserAwarenessState => state !== null && state.user.id !== currentUserId,
        );

      setRemoteCursors(others);

      const signature = presenceSignature(others);
      if (signature !== remoteSignatureRef.current) {
        remoteSignatureRef.current = signature;
        setRemoteUsers(
          others.map(({ user: remoteUser, editing }) =>
            editing === true ? { user: remoteUser, editing } : { user: remoteUser },
          ),
        );
      }
    };

    // 2. Proveedor WebSocket Hocuspocus
    const provider = new HocuspocusProvider({
      url: collabWebSocketUrl(),
      name: projectId,
      document: ydoc,
      token: accessToken,
      onStatus: (event) => {
        setStatus(event.status);
      },
      onAwarenessUpdate: ({ states }) => applyAwareness(states),
      onAwarenessChange: ({ states }) => applyAwareness(states),
      onSynced: () => {
        // La identidad se vuelve a anunciar al sincronizar: publicarla solo al
        // construir el proveedor deja a los demas esperando hasta el siguiente
        // latido de awareness, casi diez segundos despues.
        publishIdentity();
        // Solo tras sincronizar con el servidor se sabe si el proyecto ya tenia
        // modelo: crearlo antes duplicaria el contenido al reconectar.
        ensureModel();
        syncFromYDoc();
      },
    });

    providerRef.current = provider;
    publishIdentity();

    syncFromYDoc();

    return () => {
      provider.destroy();
      providerRef.current = null;
      detach();
    };
  }, [projectId, accessToken, ydoc, syncFromYDoc, ensureModel]);

  // Si cambian los datos del usuario con el proveedor activo, reanuncia la identidad
  useEffect(() => {
    if (providerRef.current && user) {
      providerRef.current.setAwarenessField('user', {
        id: user.id,
        name: user.name,
        color: colorForUser(user.id),
      });
    }
  }, [user]);

  const applyOperation = useCallback(
    (op: UmlOperationInput) => {
      ensureModel();
      const result = applyOperationToYDoc(ydoc, op);
      if (result.ok) {
        setModel(result.value);
        bumpRevision();
        markEditing();
      }
      return result;
    },
    [ydoc, ensureModel, bumpRevision, markEditing],
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
      bumpRevision();
      syncFromYDoc();
    },
    [ydoc, syncFromYDoc, bumpRevision],
  );

  /**
   * Publica la posicion del puntero en coordenadas del lienzo. Viaja por el
   * canal de awareness, no por el CRDT: es informacion volatil de sesion que no
   * debe quedar en el historial ni persistirse con el modelo.
   */
  const publishCursor = useCallback((position: { x: number; y: number } | null) => {
    providerRef.current?.setAwarenessField('cursor', position ?? undefined);
  }, []);

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
    isEditing,
    markEditing,
    revision,
  };
}
