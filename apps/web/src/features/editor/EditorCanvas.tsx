import { useCallback } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
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

interface EditorCanvasProps {
  projectId: string;
  projectName?: string;
  accessToken: string | null;
  user: { id: string; name: string } | null;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
  onInitModelHandler?: (handlers: {
    applyOperation: ReturnType<typeof useYjsModel>['applyOperation'];
    model: ReturnType<typeof useYjsModel>['model'];
  }) => void;
}

export function EditorCanvas({
  projectId,
  projectName,
  accessToken,
  user,
  selectedElement: _selectedElement,
  onSelectElement,
  onInitModelHandler,
}: EditorCanvasProps) {
  const { nodes, edges, model, applyOperation, updatePosition } = useYjsModel({
    projectId,
    projectName,
    accessToken,
    user,
  });

  // Notifica a los componentes padre de las operaciones disponibles
  if (onInitModelHandler && model) {
    onInitModelHandler({ applyOperation, model });
  }

  const handleNodeDragStop: OnNodeDrag<UmlNode> = useCallback(
    (_event, node) => {
      updatePosition(node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) });
    },
    [updatePosition],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      applyOperation({
        type: 'addRelationship',
        relationship: {
          id: createId(),
          kind: 'association',
          name: '',
          sourceId: connection.source,
          targetId: connection.target,
        },
      });
    },
    [applyOperation],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: UmlNode) => {
      const cls = model?.classes.find((c: UMLClass) => c.id === node.id);
      if (cls) {
        onSelectElement({
          type: 'classifier',
          id: cls.id,
          element: cls,
        });
      }
    },
    [model, onSelectElement],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: UmlEdge) => {
      const rel = model?.relationships.find((r: UMLRelationship) => r.id === edge.id);
      if (rel) {
        onSelectElement({
          type: 'relationship',
          id: rel.id,
          element: rel,
        });
      }
    },
    [model, onSelectElement],
  );

  const handlePaneClick = useCallback(() => {
    onSelectElement(null);
  }, [onSelectElement]);

  return (
    <div className="w-full h-full relative">
      <UmlSvgMarkers />

      <ReactFlow<UmlNode, UmlEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'umlRelationship' }}
      >
        <Background gap={16} size={1} />
        <Controls className="bg-card border-border shadow-md rounded-md" />
        <MiniMap
          nodeStrokeWidth={3}
          className="bg-card/90 border border-border shadow-sm rounded-md"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
