import { createId, type UmlOperationInput } from '@uml-forge/uml-core';
import { Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaletteProps {
  onApplyOperation: (op: UmlOperationInput) => void;
}

export function Palette({ onApplyOperation }: PaletteProps) {
  const handleAddClass = (isInterface = false, isAbstract = false) => {
    const id = createId();
    const prefix = isInterface ? 'Interfaz' : isAbstract ? 'ClaseAbstracta' : 'Clase';
    const randomSuffix = Math.floor(Math.random() * 900 + 100);
    const name = `${prefix}${randomSuffix}`;

    onApplyOperation({
      type: 'addClass',
      class: {
        id,
        name,
        isInterface,
        isAbstract,
        position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
      },
    });
  };

  const handleAddEnum = () => {
    const id = createId();
    const name = `Estado${Math.floor(Math.random() * 900 + 100)}`;

    onApplyOperation({
      type: 'addEnum',
      enum: {
        id,
        name,
        literals: ['ACTIVO', 'INACTIVO', 'PENDIENTE'],
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Crear Elementos
        </h4>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs"
            onClick={() => handleAddClass(false, false)}
          >
            <Layers className="h-4 w-4 text-primary" />
            <span>+ Nueva Clase</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs"
            onClick={() => handleAddClass(true, false)}
          >
            <Layers className="h-4 w-4 text-emerald-500" />
            <span>+ Nueva Interfaz</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs"
            onClick={() => handleAddClass(false, true)}
          >
            <Layers className="h-4 w-4 text-purple-500" />
            <span>+ Clase Abstracta</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs"
            onClick={handleAddEnum}
          >
            <Layers className="h-4 w-4 text-amber-500" />
            <span>+ Nueva Enumeracion</span>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground space-y-1.5">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Conexiones Rapidas</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Arrastra desde los conectores circulares de un nodo hacia otro para crear una asociacion,
          generalizacion o composicion.
        </p>
      </div>
    </div>
  );
}
