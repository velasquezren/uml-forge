import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { VISIBILITY_SYMBOLS, type UmlNode } from '../types';

function UmlClassNodeComponent({ data, selected }: NodeProps<UmlNode>) {
  const {
    name,
    isAbstract = false,
    isInterface = false,
    isEnum = false,
    stereotypes = [],
    attributes = [],
    operations = [],
    literals = [],
  } = data;

  return (
    <div
      className={`min-w-[200px] max-w-[340px] rounded-md border-2 bg-card text-card-foreground shadow-md transition-shadow font-sans ${
        selected ? 'border-primary ring-2 ring-primary/30 shadow-lg' : 'border-border'
      }`}
    >
      {/* Handles para conexiones React Flow en los cuatro lados */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-src"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-src"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-src"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="w-2.5 h-2.5 bg-primary border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-src"
        className="w-2.5 h-2.5 bg-primary border-background"
      />

      {/* Banda 1: Cabecera con estereotipos, interface/enum y Nombre */}
      <div className="bg-muted/40 px-3 py-2 text-center border-b border-border">
        {isInterface && (
          <div className="text-[11px] font-mono text-muted-foreground">&laquo;interface&raquo;</div>
        )}
        {isEnum && (
          <div className="text-[11px] font-mono text-muted-foreground">
            &laquo;enumeration&raquo;
          </div>
        )}
        {stereotypes.map((st) => (
          <div key={st} className="text-[11px] font-mono text-muted-foreground">
            &laquo;{st}&raquo;
          </div>
        ))}
        <div className={`text-sm font-bold tracking-tight ${isAbstract ? 'italic' : ''}`}>
          {name}
        </div>
      </div>

      {/* Banda 2: Atributos o Literales si es Enum */}
      {isEnum ? (
        <div className="p-2 text-xs font-mono border-b border-border space-y-0.5 bg-card/80">
          {literals.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic">&nbsp;</div>
          ) : (
            literals.map((lit) => (
              <div key={lit.id} className="truncate">
                {lit.name}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="p-2 text-xs font-mono border-b border-border space-y-0.5 bg-card/80">
          {attributes.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic text-center opacity-60">
              (sin atributos)
            </div>
          ) : (
            attributes.map((attr) => {
              const vis = VISIBILITY_SYMBOLS[attr.visibility] || '+';
              const multStr =
                attr.multiplicity && attr.multiplicity !== '1' ? ` [${attr.multiplicity}]` : '';
              return (
                <div key={attr.id} className="truncate">
                  <span className="text-primary font-bold mr-1.5">{vis}</span>
                  <span>{attr.name}</span>
                  <span className="text-muted-foreground">: {attr.type}</span>
                  {multStr && (
                    <span className="text-muted-foreground font-semibold">{multStr}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Banda 3: Operaciones */}
      {!isEnum && (
        <div className="p-2 text-xs font-mono space-y-0.5 bg-card/80">
          {operations.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic text-center opacity-60">
              (sin operaciones)
            </div>
          ) : (
            operations.map((op) => {
              const vis = VISIBILITY_SYMBOLS[op.visibility] || '+';
              const paramsStr = op.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
              const retStr = op.returnType ? `: ${op.returnType}` : '';

              return (
                <div key={op.id} className="truncate">
                  <span className="text-primary font-bold mr-1.5">{vis}</span>
                  <span className={op.isAbstract ? 'italic' : ''}>{op.name}</span>
                  <span className="text-muted-foreground">({paramsStr})</span>
                  {retStr && <span className="text-muted-foreground">{retStr}</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export const UmlClassNode = memo(UmlClassNodeComponent);
