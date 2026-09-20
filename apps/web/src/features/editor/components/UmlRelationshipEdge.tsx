import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react';
import { getEdgeAnchors } from '../lib/floatingEdge';
import { EDGE_STYLE_BY_KIND } from '../lib/edgeStyles';
import type { UmlEdge } from '../types';

/** Cuanto se separan del nodo las etiquetas de rol y multiplicidad. */
const END_LABEL_RATIO = 0.22;

function UmlRelationshipEdgeComponent({ id, source, target, data, selected }: EdgeProps<UmlEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const anchors = getEdgeAnchors(sourceNode, targetNode);

  if (anchors === null) {
    return null;
  }

  const { sourceX, sourceY, targetX, targetY } = anchors;
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  const kind = data?.type ?? 'association';
  const isNavigable = data?.isNavigable ?? false;
  const style = EDGE_STYLE_BY_KIND[kind];

  // La asociacion y las dos formas de agregacion solo llevan punta si el
  // extremo destino es navegable.
  const markerEnd = style.markerEnd ?? (isNavigable ? 'url(#uml-marker-association)' : undefined);

  const sourceLabelX = sourceX + (targetX - sourceX) * END_LABEL_RATIO;
  const sourceLabelY = sourceY + (targetY - sourceY) * END_LABEL_RATIO;
  const targetLabelX = targetX + (sourceX - targetX) * END_LABEL_RATIO;
  const targetLabelY = targetY + (sourceY - targetY) * END_LABEL_RATIO;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={style.markerStart}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected ? 2.5 : 1.8,
          stroke: selected ? 'var(--color-primary, #3b82f6)' : 'currentColor',
          strokeDasharray: style.strokeDasharray,
        }}
      />

      <EdgeLabelRenderer>
        {data?.name ? (
          <EdgeLabel x={labelX} y={labelY} className="border border-border/70 shadow-sm bg-card">
            {data.name}
          </EdgeLabel>
        ) : null}

        <EndLabel
          x={sourceLabelX}
          y={sourceLabelY}
          multiplicity={data?.sourceMultiplicity}
          role={data?.sourceRole}
        />
        <EndLabel
          x={targetLabelX}
          y={targetLabelY}
          multiplicity={data?.targetMultiplicity}
          role={data?.targetRole}
        />
      </EdgeLabelRenderer>
    </>
  );
}

interface EdgeLabelProps {
  x: number;
  y: number;
  className?: string;
  children: React.ReactNode;
}

function EdgeLabel({ x, y, className = '', children }: EdgeLabelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
        pointerEvents: 'none',
      }}
      className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${className}`}
    >
      {children}
    </div>
  );
}

interface EndLabelProps {
  x: number;
  y: number;
  multiplicity?: string;
  role?: string;
}

/** Multiplicidad y rol de un extremo. No se dibuja nada si el extremo esta vacio. */
function EndLabel({ x, y, multiplicity, role }: EndLabelProps) {
  if (!multiplicity && !role) {
    return null;
  }
  return (
    <EdgeLabel x={x} y={y} className="bg-background/85 font-semibold text-foreground/80">
      {multiplicity ? <span>{multiplicity}</span> : null}
      {role ? <span className="text-muted-foreground ml-1">{role}</span> : null}
    </EdgeLabel>
  );
}

export const UmlRelationshipEdge = memo(UmlRelationshipEdgeComponent);
