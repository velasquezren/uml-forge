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
  type UMLModel,
  type UmlOperationInput,
} from '@uml-forge/uml-core';
import { modelToEdges, modelToNodes } from '../lib/flowMapper';
import type { UmlEdge, UmlNode, UserAwarenessState } from '../types';

const USER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

function getRandomColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index] ?? '#3b82f6';
}

interface UseYjsModelOptions {
  projectId: string;
  projectName?: string;
  accessToken: string | null;
  user: { id: string; name: string } | null;
}

export function useYjsModel({
  projectId,
  projectName = 'Proyecto UML',
  accessToken,
  user,
}: UseYjsModelOptions) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [model, setModel] = useState<UMLModel | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [remoteUsers, setRemoteUsers] = useState<UserAwarenessState[]>([]);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  // Deriva el estado de React exclusivamente a partir de Y.Doc
  const syncFromYDoc = useCallback(() => {
    if (!hasModel(ydoc)) {
      writeModel(ydoc, createEmptyModel(projectName, { id: projectId }));
    }
    const result = fromYDoc(ydoc);
    if (result.ok) {
      setModel(result.value);
    }
  }, [ydoc, projectName, projectId]);

  useEffect(() => {
    // 1. Persistencia local con IndexeddbPersistence (y-indexeddb)
    const idbPersistence = new IndexeddbPersistence(projectId, ydoc);
    idbPersistence.on('synced', () => {
      syncFromYDoc();
    });

    if (!accessToken) {
      return () => {
        void idbPersistence.destroy();
      };
    }

    // 2. Proveedor WebSocket Hocuspocus
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:3000/collab`;

    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: projectId,
      document: ydoc,
      token: accessToken,
      onStatus: (event) => {
        setStatus(event.status);
      },
    });

    providerRef.current = provider;

    const userColor = user ? getRandomColor(user.id) : '#3b82f6';
    provider.setAwarenessField('user', {
      id: user?.id || 'anon',
      name: user?.name || 'Usuario',
      color: userColor,
    });

    const handleAwarenessChange = () => {
      const awareness = provider.awareness;
      if (!awareness) return;
      const states = Array.from(awareness.getStates().values()) as UserAwarenessState[];
      const others = states.filter((s) => s.user && s.user.id !== user?.id);
      setRemoteUsers(others);
    };

    provider.awareness?.on('change', handleAwarenessChange);

    // Observa cualquier cambio profundo en el YDoc
    const rootClasses = ydoc.getMap('classes');
    const rootEnums = ydoc.getMap('enums');
    const rootRelationships = ydoc.getMap('relationships');
    const rootMeta = ydoc.getMap('meta');

    const observer = () => syncFromYDoc();

    rootClasses.observeDeep(observer);
    rootEnums.observeDeep(observer);
    rootRelationships.observeDeep(observer);
    rootMeta.observeDeep(observer);

    syncFromYDoc();

    return () => {
      rootClasses.unobserveDeep(observer);
      rootEnums.unobserveDeep(observer);
      rootRelationships.unobserveDeep(observer);
      rootMeta.unobserveDeep(observer);
      provider.awareness?.off('change', handleAwarenessChange);
      provider.destroy();
      void idbPersistence.destroy();
    };
  }, [projectId, accessToken, user, ydoc, syncFromYDoc]);

  const applyOperation = useCallback(
    (op: UmlOperationInput) => {
      const result = applyOperationToYDoc(ydoc, op);
      if (result.ok) {
        setModel(result.value);
      }
      return result;
    },
    [ydoc],
  );

  const updatePosition = useCallback(
    (classId: string, position: { x: number; y: number }) => {
      applyOperation({
        type: 'setPosition',
        classId,
        position,
      });
    },
    [applyOperation],
  );

  const nodes: UmlNode[] = useMemo(() => (model ? modelToNodes(model) : []), [model]);
  const edges: UmlEdge[] = useMemo(() => (model ? modelToEdges(model) : []), [model]);

  return {
    ydoc,
    model,
    nodes,
    edges,
    status,
    remoteUsers,
    applyOperation,
    updatePosition,
  };
}
