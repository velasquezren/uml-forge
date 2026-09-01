export function UmlSvgMarkers() {
  return (
    <svg className="absolute top-0 left-0 w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
      <defs>
        {/* Generalizacion: Triangulo hueco cerrado en destino */}
        <marker
          id="uml-marker-generalization"
          viewBox="0 0 20 20"
          refX="16"
          refY="10"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <polygon
            points="0 4, 16 10, 0 16"
            className="fill-background stroke-foreground stroke-2"
          />
        </marker>

        {/* Realizacion: Triangulo hueco cerrado en destino */}
        <marker
          id="uml-marker-realization"
          viewBox="0 0 20 20"
          refX="16"
          refY="10"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <polygon
            points="0 4, 16 10, 0 16"
            className="fill-background stroke-foreground stroke-2"
          />
        </marker>

        {/* Composicion: Rombo relleno en origen */}
        <marker
          id="uml-marker-composition"
          viewBox="0 0 24 24"
          refX="0"
          refY="12"
          markerWidth="14"
          markerHeight="14"
          orient="auto"
        >
          <polygon
            points="0 12, 10 5, 20 12, 10 19"
            className="fill-foreground stroke-foreground stroke-2"
          />
        </marker>

        {/* Agregacion: Rombo hueco en origen */}
        <marker
          id="uml-marker-aggregation"
          viewBox="0 0 24 24"
          refX="0"
          refY="12"
          markerWidth="14"
          markerHeight="14"
          orient="auto"
        >
          <polygon
            points="0 12, 10 5, 20 12, 10 19"
            className="fill-background stroke-foreground stroke-2"
          />
        </marker>

        {/* Asociacion: Flecha abierta en destino */}
        <marker
          id="uml-marker-association"
          viewBox="0 0 20 20"
          refX="14"
          refY="10"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <polyline points="2 4, 14 10, 2 16" fill="none" className="stroke-foreground stroke-2" />
        </marker>

        {/* Dependencia: Flecha abierta en destino */}
        <marker
          id="uml-marker-dependency"
          viewBox="0 0 20 20"
          refX="14"
          refY="10"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <polyline points="2 4, 14 10, 2 16" fill="none" className="stroke-foreground stroke-2" />
        </marker>
      </defs>
    </svg>
  );
}
