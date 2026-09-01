import { createId, type UMLRelationship, type UmlOperationInput } from '@uml-forge/uml-core';
import { Layers, Spline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RELATIONSHIP_KIND_LABELS, RELATIONSHIP_KINDS } from '../lib/edgeStyles';

interface PaletteProps {
  onApplyOperation: (op: UmlOperationInput) => void;
  relationshipKind: UMLRelationship['kind'];
  onRelationshipKindChange: (kind: UMLRelationship['kind']) => void;
}

/** Posicion de arranque de un elemento nuevo, dispersa para no apilarlos. */
function scatteredPosition(): { x: number; y: number } {
  return {
    x: Math.round(250 + Math.random() * 200),
    y: Math.round(150 + Math.random() * 200),
  };
}

export function Palette({
  onApplyOperation,
  relationshipKind,
  onRelationshipKindChange,
}: PaletteProps) {
  const handleAddClass = (isInterface = false, isAbstract = false) => {
    const prefix = isInterface ? 'Interfaz' : isAbstract ? 'ClaseAbstracta' : 'Clase';
    const suffix = Math.floor(Math.random() * 900 + 100);

    onApplyOperation({
      type: 'addClass',
      class: {
        id: createId(),
        name: `${prefix}${suffix}`,
        isInterface,
        isAbstract,
        position: scatteredPosition(),
      },
    });
  };

  const handleAddEnum = () => {
    onApplyOperation({
      type: 'addEnum',
      enum: {
        id: createId(),
        name: `Estado${Math.floor(Math.random() * 900 + 100)}`,
        literals: ['ACTIVO', 'INACTIVO', 'PENDIENTE'],
        position: scatteredPosition(),
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

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Relaciones
        </h4>
        <Label
          htmlFor="relationship-kind"
          className="text-[11px] text-muted-foreground font-normal block"
        >
          Tipo que se creara al conectar
        </Label>
        <Select
          value={relationshipKind}
          onValueChange={(value) => onRelationshipKindChange(value as UMLRelationship['kind'])}
        >
          <SelectTrigger id="relationship-kind" className="h-8 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind} className="text-xs">
                {RELATIONSHIP_KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground space-y-1.5">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <Spline className="h-3.5 w-3.5 text-primary" />
          <span>Como conectar</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Arrastra desde el conector circular del borde de un nodo hasta otro nodo. La relacion
          nacera con el tipo elegido arriba y se puede cambiar despues en el inspector.
        </p>
        <p className="text-[11px] leading-relaxed">
          Con un elemento seleccionado, la tecla Suprimir lo elimina del modelo.
        </p>
      </div>
    </div>
  );
}
