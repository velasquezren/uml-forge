import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { UmlEdge } from '../types';

function UmlRelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition: _targetPosition,
  data,
  selected,
}: EdgeProps<UmlEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
  });

  const relType = data?.type || 'association';
  const name = data?.name;
  const sourceRole = data?.sourceRole;
  const targetRole = data?.targetRole;
  const sourceMultiplicity = data?.sourceMultiplicity;
  const targetMultiplicity = data?.targetMultiplicity;
  const isNavigable = data?.isNavigable ?? false;

  let markerStart: string | undefined;
  let markerEnd: string | undefined;
  let strokeDasharray: string | undefined;

  switch (relType) {
    case 'generalization':
      markerEnd = 'url(#uml-marker-generalization)';
      break;
    case 'realization':
      markerEnd = 'url(#uml-marker-realization)';
      strokeDasharray = '6,4';
      break;
    case 'composition':
      markerStart = 'url(#uml-marker-composition)';
      if (isNavigable) {
        markerEnd = 'url(#uml-marker-association)';
      }
      break;
    case 'aggregation':
      markerStart = 'url(#uml-marker-aggregation)';
      if (isNavigable) {
        markerEnd = 'url(#uml-marker-association)';
      }
      break;
    case 'dependency':
      markerEnd = 'url(#uml-marker-dependency)';
      strokeDasharray = '5,5';
      break;
    case 'association':
    default:
      if (isNavigable) {
        markerEnd = 'url(#uml-marker-association)';
      }
      break;
  }

  const sourceLabelX = sourceX + (labelX - sourceX) * 0.3;
  const sourceLabelY = sourceY + (labelY - sourceY) * 0.3;
  const targetLabelX = targetX + (labelX - targetX) * 0.3;
  const targetLabelY = targetY + (labelY - targetY) * 0.3;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected ? 2.5 : 1.8,
          stroke: selected ? 'var(--color-primary, #3b82f6)' : 'currentColor',
          strokeDasharray,
        }}
      />

      <EdgeLabelRenderer>
        {name && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-card px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/70 shadow-sm"
          >
            {name}
          </div>
        )}

        {(sourceMultiplicity || sourceRole) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceLabelX}px,${sourceLabelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] font-mono font-semibold bg-background/80 px-1 rounded text-foreground/80"
          >
            {sourceMultiplicity && <span>{sourceMultiplicity}</span>}
            {sourceRole && <span className="text-muted-foreground ml-1">{sourceRole}</span>}
          </div>
        )}

        {(targetMultiplicity || targetRole) && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetLabelX}px,${targetLabelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] font-mono font-semibold bg-background/80 px-1 rounded text-foreground/80"
          >
            {targetMultiplicity && <span>{targetMultiplicity}</span>}
            {targetRole && <span className="text-muted-foreground ml-1">{targetRole}</span>}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const UmlRelationshipEdge = memo(UmlRelationshipEdgeComponent);
