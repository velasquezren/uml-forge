import type { UMLRelationship, UmlOperationInput } from '@uml-forge/uml-core';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RELATIONSHIP_KIND_LABELS, RELATIONSHIP_KINDS } from '../lib/edgeStyles';

interface RelationshipInspectorProps {
  rel: UMLRelationship;
  onApplyOperation: (op: UmlOperationInput) => void;
}

export function RelationshipInspector({ rel, onApplyOperation }: RelationshipInspectorProps) {
  const handleUpdateKind = (kind: UMLRelationship['kind']) => {
    onApplyOperation({
      type: 'updateRelationship',
      id: rel.id,
      changes: { kind },
    });
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Tipo de Relacion
        </Label>
        <Select
          value={rel.kind}
          onValueChange={(val) => handleUpdateKind(val as UMLRelationship['kind'])}
        >
          <SelectTrigger className="h-8 text-xs mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {RELATIONSHIP_KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Nombre / Descripcion
        </Label>
        <Input
          value={rel.name || ''}
          onChange={(e) =>
            onApplyOperation({
              type: 'updateRelationship',
              id: rel.id,
              changes: { name: e.target.value },
            })
          }
          className="h-8 text-xs mt-1"
        />
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full gap-2 mt-4"
        onClick={() => onApplyOperation({ type: 'deleteRelationship', id: rel.id })}
      >
        <Trash2 className="h-4 w-4" />
        <span>Eliminar Relacion</span>
      </Button>
    </div>
  );
}
