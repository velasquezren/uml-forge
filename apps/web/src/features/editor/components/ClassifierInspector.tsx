import { useState } from 'react';
import {
  createId,
  type UMLClass,
  type UMLOperation,
  type UMLProperty,
  type UmlOperationInput,
} from '@uml-forge/uml-core';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClassifierInspectorProps {
  cls: UMLClass;
  onApplyOperation: (op: UmlOperationInput) => void;
  typeNames?: Record<string, string>;
}

function normalizeInputType(input: string, typeNames?: Record<string, string>): string {
  const trimmed = input.trim();
  if (!trimmed) return 'String';

  const lower = trimmed.toLowerCase();
  if (lower === 'string' || lower === 'str' || lower === 'varchar' || lower === 'char') return 'String';
  if (lower === 'int' || lower === 'integer' || lower === 'short' || lower === 'byte') return 'Integer';
  if (lower === 'long' || lower === 'bigint') return 'Long';
  if (lower === 'double' || lower === 'float' || lower === 'real' || lower === 'number') return 'Double';
  if (lower === 'decimal' || lower === 'bigdecimal' || lower === 'numeric') return 'BigDecimal';
  if (lower === 'bool' || lower === 'boolean') return 'Boolean';
  if (lower === 'date') return 'Date';
  if (lower === 'datetime' || lower === 'timestamp' || lower === 'time') return 'DateTime';
  if (lower === 'uuid' || lower === 'guid') return 'UUID';
  if (lower === 'text' || lower === 'clob') return 'Text';

  if (typeNames) {
    for (const [id, name] of Object.entries(typeNames)) {
      if (name.toLowerCase() === lower) {
        return id;
      }
    }
  }

  return trimmed;
}

export function ClassifierInspector({ cls, onApplyOperation, typeNames }: ClassifierInspectorProps) {
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('String');
  const [newOpName, setNewOpName] = useState('');
  const [newOpReturn, setNewOpReturn] = useState('void');

  const handleUpdateName = (name: string) => {
    onApplyOperation({
      type: 'updateClass',
      id: cls.id,
      changes: { name },
    });
  };

  const handleToggleAbstract = () => {
    onApplyOperation({
      type: 'updateClass',
      id: cls.id,
      changes: { isAbstract: !cls.isAbstract },
    });
  };

  const handleToggleInterface = () => {
    onApplyOperation({
      type: 'updateClass',
      id: cls.id,
      changes: { isInterface: !cls.isInterface },
    });
  };

  const handleAddAttribute = () => {
    if (!newAttrName.trim()) return;
    const resolvedType = normalizeInputType(newAttrType, typeNames);
    onApplyOperation({
      type: 'addAttribute',
      classId: cls.id,
      attribute: {
        id: createId(),
        name: newAttrName.trim(),
        type: resolvedType,
        visibility: 'private',
        multiplicity: '1',
        isStatic: false,
        isDerived: false,
        isUnique: false,
        isNullable: true,
        isIdentifier: false,
        defaultValue: null,
      },
    });
    setNewAttrName('');
    setNewAttrType('String');
  };

  const handleDeleteAttribute = (attrId: string) => {
    onApplyOperation({
      type: 'deleteAttribute',
      id: attrId,
    });
  };

  const handleAddOperation = () => {
    if (!newOpName.trim()) return;
    const rawReturn = newOpReturn.trim();
    const returnType =
      !rawReturn || rawReturn.toLowerCase() === 'void'
        ? null
        : normalizeInputType(rawReturn, typeNames);
    onApplyOperation({
      type: 'addOperation',
      classId: cls.id,
      operation: {
        id: createId(),
        name: newOpName.trim(),
        returnType,
        visibility: 'public',
        isAbstract: false,
        isStatic: false,
        parameters: [],
      },
    });
    setNewOpName('');
    setNewOpReturn('void');
  };

  const handleDeleteOperation = (opId: string) => {
    onApplyOperation({
      type: 'deleteOperation',
      id: opId,
    });
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Nombre del Clasificador
        </Label>
        <Input
          value={cls.name}
          onChange={(e) => handleUpdateName(e.target.value)}
          className="h-8 text-xs mt-1"
        />
      </div>

      <div className="flex items-center space-x-4 pt-1">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cls.isAbstract ?? false}
            onChange={handleToggleAbstract}
            className="rounded border-border"
          />
          <span className="font-medium">Abstracta</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cls.isInterface ?? false}
            onChange={handleToggleInterface}
            className="rounded border-border"
          />
          <span className="font-medium">Interfaz</span>
        </label>
      </div>

      {/* Atributos */}
      <div className="border-t border-border pt-3">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-2">
          Atributos ({cls.attributes?.length ?? 0})
        </Label>
        <div className="space-y-1.5 max-h-36 overflow-y-auto mb-2 pr-1 font-mono">
          {cls.attributes?.map((attr: UMLProperty) => {
            const displayedType = typeNames?.[attr.type] ?? attr.type;
            const label = `${attr.visibility === 'public' ? '+' : '-'} ${attr.name}: ${displayedType}`;
            return (
              <div
                key={attr.id}
                className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-[11px] gap-1.5 min-w-0"
              >
                <span className="truncate min-w-0 flex-1" title={label}>
                  {label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDeleteAttribute(attr.id)}
                  aria-label="Eliminar atributo"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-1.5 items-center">
          <Input
            placeholder="nombre"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <Input
            placeholder="Tipo"
            list="common-types-list"
            value={newAttrType}
            onChange={(e) => setNewAttrType(e.target.value)}
            className="h-7 text-xs w-24"
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2"
            onClick={handleAddAttribute}
            aria-label="Anadir atributo"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Operaciones */}
      <div className="border-t border-border pt-3">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-2">
          Metodos / Operaciones ({cls.operations?.length ?? 0})
        </Label>
        <div className="space-y-1.5 max-h-36 overflow-y-auto mb-2 pr-1 font-mono">
          {cls.operations?.map((op: UMLOperation) => {
            const displayedReturn = op.returnType ? (typeNames?.[op.returnType] ?? op.returnType) : 'void';
            const label = `+ ${op.name}(): ${displayedReturn}`;
            return (
              <div
                key={op.id}
                className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-[11px] gap-1.5 min-w-0"
              >
                <span className="truncate min-w-0 flex-1" title={label}>
                  {label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDeleteOperation(op.id)}
                  aria-label="Eliminar operacion"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-1.5 items-center">
          <Input
            placeholder="metodo"
            value={newOpName}
            onChange={(e) => setNewOpName(e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <Input
            placeholder="Retorno"
            list="common-types-list"
            value={newOpReturn}
            onChange={(e) => setNewOpReturn(e.target.value)}
            className="h-7 text-xs w-24"
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2"
            onClick={handleAddOperation}
            aria-label="Anadir metodo"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <datalist id="common-types-list">
        <option value="String" />
        <option value="Integer" />
        <option value="Long" />
        <option value="Double" />
        <option value="BigDecimal" />
        <option value="Boolean" />
        <option value="Date" />
        <option value="DateTime" />
        <option value="UUID" />
        <option value="Text" />
        {typeNames &&
          Object.values(typeNames).map((typeName) => (
            <option key={typeName} value={typeName} />
          ))}
      </datalist>
    </div>
  );
}
