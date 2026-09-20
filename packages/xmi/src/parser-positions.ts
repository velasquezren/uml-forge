import type { Position } from '@uml-forge/uml-core';
import { toArray } from './parser-helpers.js';
import { asNode, attr, firstAttr, numericAttr, type RawXmlNode } from './raw-xml.js';

/**
 * Recoge las coordenadas de la extension de diagrama, indexadas por el
 * identificador original del documento y no por el UUID ya traducido.
 * Soporta tanto la extension nativa de UMLForge como los diagramas de Enterprise Architect.
 */
export function readDiagramPositions(
  root: RawXmlNode,
  modelNode: RawXmlNode,
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const extensions = toArray(root['xmi:Extension'] ?? modelNode['xmi:Extension']) as RawXmlNode[];

  for (const extension of extensions) {
    // 1. Soporte para extension propia UMLForge: <diagramElements><element xmi:idref="..." x="..." y="..."/>
    const container = asNode(extension['diagramElements'] ?? extension['elements']);
    if (container !== null) {
      for (const element of toArray(container['element']) as RawXmlNode[]) {
        const idRef = firstAttr(element, 'xmi:idref', 'idref', 'subject');
        if (idRef !== undefined) {
          const x = numericAttr(element, 'x', NaN);
          const y = numericAttr(element, 'y', NaN);
          if (!isNaN(x) && !isNaN(y)) {
            positions.set(idRef, { x, y });
          }
        }
      }
    }

    // 2. Soporte para diagramas de Enterprise Architect: <diagrams><diagram><elements><element subject="..." geometry="Left=...;Top=..."/>
    const diagramsContainer = asNode(extension['diagrams']);
    if (diagramsContainer !== null) {
      for (const diagram of toArray(diagramsContainer['diagram']) as RawXmlNode[]) {
        const elementsContainer = asNode(diagram['elements']);
        if (elementsContainer !== null) {
          for (const el of toArray(elementsContainer['element']) as RawXmlNode[]) {
            const subject = firstAttr(el, 'subject', 'xmi:idref', 'idref');
            const geom = attr(el, 'geometry') ?? '';
            if (subject) {
              const leftMatch = geom.match(/Left=(-?\d+)/i);
              const topMatch = geom.match(/Top=(-?\d+)/i);
              if (leftMatch && topMatch && leftMatch[1] && topMatch[1]) {
                positions.set(subject, {
                  x: Math.abs(parseInt(leftMatch[1], 10)),
                  y: Math.abs(parseInt(topMatch[1], 10)),
                });
              } else {
                const leftAttr = firstAttr(el, 'left', 'Left');
                const topAttr = firstAttr(el, 'top', 'Top');
                if (leftAttr !== undefined && topAttr !== undefined) {
                  positions.set(subject, {
                    x: Math.abs(parseInt(leftAttr, 10)),
                    y: Math.abs(parseInt(topAttr, 10)),
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return positions;
}
