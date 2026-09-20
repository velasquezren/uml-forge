import { Position, type InternalNode, type Node } from '@xyflow/react';

/** Punto del lienzo en coordenadas del flujo. */
export interface EdgePoint {
  readonly x: number;
  readonly y: number;
}

/** Anclaje calculado de una arista: los dos extremos y el lado por el que sale. */
export interface EdgeAnchors {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly sourcePosition: Position;
  readonly targetPosition: Position;
}

/** Medidas por defecto mientras React Flow todavia no ha medido el nodo. */
const FALLBACK_WIDTH = 220;
const FALLBACK_HEIGHT = 120;

interface Box {
  readonly centerX: number;
  readonly centerY: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

function boxOf(node: InternalNode<Node>): Box {
  const width = node.measured.width ?? FALLBACK_WIDTH;
  const height = node.measured.height ?? FALLBACK_HEIGHT;
  return {
    centerX: node.internals.positionAbsolute.x + width / 2,
    centerY: node.internals.positionAbsolute.y + height / 2,
    halfWidth: width / 2,
    halfHeight: height / 2,
  };
}

/**
 * Punto donde la recta que une los dos centros corta el borde del rectangulo.
 * Es lo que hace que la arista nazca del lado que mira al otro clasificador en
 * lugar de colgar siempre del mismo conector, como exige un diagrama UML legible.
 */
function borderIntersection(box: Box, towards: Box): EdgePoint {
  const dx = towards.centerX - box.centerX;
  const dy = towards.centerY - box.centerY;

  if (dx === 0 && dy === 0) {
    return { x: box.centerX, y: box.centerY };
  }

  // Escala la direccion hasta tocar el lado mas cercano del rectangulo.
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : box.halfWidth / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : box.halfHeight / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return { x: box.centerX + dx * scale, y: box.centerY + dy * scale };
}

/** Lado del rectangulo al que pertenece un punto de su borde. */
function sideOf(box: Box, point: EdgePoint): Position {
  const tolerance = 1;
  if (point.x <= box.centerX - box.halfWidth + tolerance) {
    return Position.Left;
  }
  if (point.x >= box.centerX + box.halfWidth - tolerance) {
    return Position.Right;
  }
  return point.y <= box.centerY ? Position.Top : Position.Bottom;
}

/**
 * Calcula los anclajes flotantes de una arista entre dos nodos. Devuelve null si
 * React Flow todavia no conoce alguno de los dos extremos.
 */
export function getEdgeAnchors(
  source: InternalNode<Node> | undefined,
  target: InternalNode<Node> | undefined,
): EdgeAnchors | null {
  if (source === undefined || target === undefined) {
    return null;
  }

  const sourceBox = boxOf(source);
  const targetBox = boxOf(target);
  const sourcePoint = borderIntersection(sourceBox, targetBox);
  const targetPoint = borderIntersection(targetBox, sourceBox);

  return {
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    sourcePosition: sideOf(sourceBox, sourcePoint),
    targetPosition: sideOf(targetBox, targetPoint),
  };
}
