import { useEffect, useState } from 'react';
import { parseMultiplicity, type UMLEnd } from '@uml-forge/uml-core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Multiplicidades habituales, para ponerlas de un clic. */
const COMMON_MULTIPLICITIES = ['1', '0..1', '1..*', '0..*', '*'] as const;

interface RelationshipEndFieldsProps {
  title: string;
  end: UMLEnd;
  onChange: (end: UMLEnd) => void;
}

/**
 * Edicion de un extremo de la relacion: cardinalidad y rol. La cardinalidad se
 * escribe libremente porque UML admite `n..m`, pero solo se emite la operacion
 * cuando la cadena es valida; mientras se teclea "0.." no se toca el modelo.
 */
export function RelationshipEndFields({ title, end, onChange }: RelationshipEndFieldsProps) {
  const [draft, setDraft] = useState(end.multiplicity);

  // Una edicion remota del mismo extremo debe verse aqui.
  useEffect(() => {
    setDraft(end.multiplicity);
  }, [end.multiplicity]);

  const isValid = parseMultiplicity(draft) !== null;

  const applyMultiplicity = (value: string) => {
    setDraft(value);
    if (parseMultiplicity(value) !== null) {
      onChange({ ...end, multiplicity: value });
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</Label>

      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(event) => applyMultiplicity(event.target.value)}
          className={`h-8 w-20 text-xs ${isValid ? '' : 'border-destructive'}`}
          aria-label={`Cardinalidad ${title}`}
          aria-invalid={!isValid}
        />
        <Input
          value={end.role}
          onChange={(event) => onChange({ ...end, role: event.target.value })}
          placeholder="rol"
          className="h-8 flex-1 text-xs"
          aria-label={`Rol ${title}`}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {COMMON_MULTIPLICITIES.map((value) => (
          <Button
            key={value}
            type="button"
            variant={end.multiplicity === value ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-1.5 font-mono text-[11px]"
            onClick={() => applyMultiplicity(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      {!isValid && (
        <p className="text-[10px] text-destructive">
          Cardinalidad invalida: usa 1, 0..1, 1..*, 0..*, * o n..m
        </p>
      )}
    </div>
  );
}
