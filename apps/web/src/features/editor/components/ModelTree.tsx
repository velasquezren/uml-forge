import type {
  UMLClass,
  UMLEnum,
  UMLModel,
  UMLRelationship,
  UmlOperationInput,
} from '@uml-forge/uml-core';
import { ChevronRight, FileCode, Layers, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SelectedElement } from '../types';

interface ModelTreeProps {
  model: UMLModel | null;
  selectedElement: SelectedElement | null;
  onSelectElement: (selected: SelectedElement | null) => void;
  onApplyOperation: (op: UmlOperationInput) => void;
}

export function ModelTree({
  model,
  selectedElement,
  onSelectElement,
  onApplyOperation,
}: ModelTreeProps) {
  if (!model) {
    return <div className="text-xs text-muted-foreground p-3">Cargando arbol del modelo...</div>;
  }

  const handleDeleteClass = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyOperation({ type: 'deleteClass', id });
    if (selectedElement?.id === id) {
      onSelectElement(null);
    }
  };

  const handleDeleteEnum = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyOperation({ type: 'deleteEnum', id });
    if (selectedElement?.id === id) {
      onSelectElement(null);
    }
  };

  const handleDeleteRelationship = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyOperation({ type: 'deleteRelationship', id });
    if (selectedElement?.id === id) {
      onSelectElement(null);
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Clasificadores */}
      <div>
        <div className="text-[11px] font-sans font-semibold uppercase text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          <span>Clasificadores ({model.classes.length + model.enums.length})</span>
        </div>
        <div className="space-y-1 pl-1">
          {model.classes.map((cls: UMLClass) => {
            const isSelected = selectedElement?.id === cls.id;
            return (
              <div
                key={cls.id}
                onClick={() =>
                  onSelectElement({
                    type: 'classifier',
                    id: cls.id,
                    element: cls,
                  })
                }
                className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-accent/60'
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">
                    {cls.name}
                    {cls.isInterface ? ' «I»' : cls.isAbstract ? ' «A»' : ''}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => handleDeleteClass(cls.id, e)}
                  aria-label="Eliminar clase"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          {model.enums.map((enm: UMLEnum) => {
            const isSelected = selectedElement?.id === enm.id;
            return (
              <div
                key={enm.id}
                onClick={() =>
                  onSelectElement({
                    type: 'classifier',
                    id: enm.id,
                    element: enm as unknown as UMLClass,
                  })
                }
                className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-accent/60'
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <ChevronRight className="h-3 w-3 text-amber-500" />
                  <span className="truncate">{enm.name} «E»</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => handleDeleteEnum(enm.id, e)}
                  aria-label="Eliminar enumeracion"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relaciones */}
      <div>
        <div className="text-[11px] font-sans font-semibold uppercase text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1">
          <Link2 className="h-3.5 w-3.5" />
          <span>Relaciones ({model.relationships.length})</span>
        </div>
        <div className="space-y-1 pl-1">
          {model.relationships.map((rel: UMLRelationship) => {
            const isSelected = selectedElement?.id === rel.id;
            const sourceName = model.classes.find((c) => c.id === rel.sourceId)?.name || 'Origen';
            const targetName = model.classes.find((c) => c.id === rel.targetId)?.name || 'Destino';

            return (
              <div
                key={rel.id}
                onClick={() =>
                  onSelectElement({
                    type: 'relationship',
                    id: rel.id,
                    element: rel,
                  })
                }
                className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-accent/60'
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <FileCode className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">
                    {sourceName} &rarr; {targetName} ({rel.kind})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => handleDeleteRelationship(rel.id, e)}
                  aria-label="Eliminar relacion"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
