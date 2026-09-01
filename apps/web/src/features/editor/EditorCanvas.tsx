import { useCallback, useEffect, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createId, type UMLClass, type UMLRelationship } from '@uml-forge/uml-core';
import { UmlClassNode } from './components/UmlClassNode';
import { UmlRelationshipEdge } from './components/UmlRelationshipEdge';
import { UmlSvgMarkers } from './components/UmlSvgMarkers';
import { useYjsModel } from './hooks/useYjsModel';
import type { SelectedElement, UmlEdge, UmlNode } from './types';

const nodeTypes = {
  umlClass: UmlClassNode,
};

const edgeTypes = {
  umlRelationship: UmlRelationshipEdge,
};

/** Manejadores que el lienzo publica hacia la pagina que lo contiene. */
export interface EditorCanvasHandlers {
  applyOperation: ReturnType<typeof useYjsModel>['applyOperation'];
  replaceModel: ReturnType<typeof useYjsModel>['replaceModel'];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  model: ReturnType<typeof useYjsModel>['model'];
  remoteUsers: ReturnType<typeof useYjsModel>['remoteUsers'];
}

interface EditorCanvasProps {
  projectId: string;
  projectName?: string;
  accessToken: string | null;
  user: { id: string; name: string } | null;
  selectedElement: SelectedElement | null;
  relationshipKind: UMLRelationship['kind'];
  onSelectElement: (element: SelectedElement | null) => void;
  onInitModelHandler?: (handlers: EditorCanvasHandlers) => void;
}

export function EditorCanvas({
  projectId,
  projectName,
  accessToken,
  user,
  selectedElement,
  relationshipKind,
  onSelectElement,
  onInitModelHandler,
}: EditorCanvasProps) {
  const {
    nodes,
    edges,
    model,
    remoteUsers,
    applyOperation,
    updatePosition,
    replaceModel,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useYjsModel({ projectId, projectName, accessToken, user });

  /**
   * React Flow necesita ser duenno de las posiciones mientras se arrastra: sin
   * un estado propio y su `onNodesChange` los nodos no se pueden mover. El
   * modelo sigue siendo la fuente de verdad y reimpone su version en cuanto
   * cambia, tanto por una edicion propia como por una remota.
   */
  const [flowNodes, setFlowNodes] = useState<UmlNode[]>(nodes);
  const [flowEdges, setFlowEdges] = useState<UmlEdge[]>(edges);
  const selectedId = selectedElement?.id ?? null;

  // La seleccion se refleja en el lienzo aunque venga del arbol del modelo.
  useEffect(() => {
    setFlowNodes(nodes.map((node) => ({ ...node, selected: node.id === selectedId })));
  }, [nodes, selectedId]);

  useEffect(() => {
    setFlowEdges(edges.map((edge) => ({ ...edge, selected: edge.id === selectedId })));
  }, [edges, selectedId]);

  useEffect(() => {
    onInitModelHandler?.({
      applyOperation,
      replaceModel,
      undo,
      redo,
      canUndo,
      canRedo,
      model,
      remoteUsers,
    });
  }, [
    onInitModelHandler,
    applyOperation,
    replaceModel,
    undo,
    redo,
    canUndo,
    canRedo,
    model,
    remoteUsers,
  ]);

  const handleNodesChange = useCallback((changes: NodeChange<UmlNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const handleEdgesChange = useCallback((changes: EdgeChange<UmlEdge>[]) => {
    setFlowEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  // La posicion solo se escribe en el CRDT al soltar: emitir en cada pixel del
  // arrastre inundaria la red y el historial de deshacer.
  const handleNodeDragStop: OnNodeDrag<UmlNode> = useCallback(
    (_event, node) => {
      updatePosition(node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) });
    },
    [updatePosition],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return;
      }
      applyOperation({
        type: 'addRelationship',
        relationship: {
          id: createId(),
          kind: relationshipKind,
          name: '',
          sourceId: connection.source,
          targetId: connection.target,
        },
      });
    },
    [applyOperation, relationshipKind],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: UmlNode) => {
      const cls = model?.classes.find((c: UMLClass) => c.id === node.id);
      if (cls) {
        onSelectElement({ type: 'classifier', id: cls.id, element: cls });
        return;
      }
      const enm = model?.enums.find((e) => e.id === node.id);
      if (enm) {
        onSelectElement({ type: 'classifier', id: enm.id, element: enm });
      }
    },
    [model, onSelectElement],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: UmlEdge) => {
      const rel = model?.relationships.find((r: UMLRelationship) => r.id === edge.id);
      if (rel) {
        onSelectElement({ type: 'relationship', id: rel.id, element: rel });
      }
    },
    [model, onSelectElement],
  );

  const handlePaneClick = useCallback(() => {
    onSelectElement(null);
  }, [onSelectElement]);

  /** Suprimir en el lienzo borra el clasificador o la relacion en el modelo. */
  const handleNodesDelete = useCallback(
    (deleted: UmlNode[]) => {
      for (const node of deleted) {
        const isEnum = model?.enums.some((e) => e.id === node.id) ?? false;
        applyOperation(
          isEnum ? { type: 'deleteEnum', id: node.id } : { type: 'deleteClass', id: node.id },
        );
      }
      onSelectElement(null);
    },
    [applyOperation, model, onSelectElement],
  );

  const handleEdgesDelete = useCallback(
    (deleted: UmlEdge[]) => {
      for (const edge of deleted) {
        applyOperation({ type: 'deleteRelationship', id: edge.id });
      }
      onSelectElement(null);
    },
    [applyOperation, onSelectElement],
  );

  return (
    <div className="w-full h-full relative">
      <UmlSvgMarkers />

      <ReactFlow<UmlNode, UmlEdge>
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        deleteKeyCode={['Delete']}
        defaultEdgeOptions={{ type: 'umlRelationship' }}
      >
        <Background gap={16} size={1} />
        <Controls className="bg-card border-border shadow-md rounded-md overflow-hidden" />
        <MiniMap
          nodeStrokeWidth={3}
          className="bg-card/90 border border-border shadow-sm rounded-md"
          maskColor="rgba(0, 0, 0, 0.6)"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
