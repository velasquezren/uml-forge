import type { UmlOperation } from '@uml-forge/uml-core';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiSuggestion } from './aiClient';

interface AiSuggestionReviewProps {
  suggestion: AiSuggestion;
  isApplying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

/** Etiqueta legible de una operacion sugerida. */
function describeOperation(operation: UmlOperation): string {
  const record = operation as unknown as Record<string, unknown>;
  const target = record.class ?? record.enum ?? record.relationship ?? record.attribute;
  const name =
    typeof target === 'object' && target !== null && 'name' in target
      ? (target as { name?: unknown }).name
      : undefined;

  return typeof name === 'string' && name.length > 0
    ? `${operation.type}: ${name}`
    : operation.type;
}

/**
 * Muestra lo que propone la IA antes de tocar el modelo. Nada se aplica sin que
 * la persona lo confirme: la sugerencia viaja a todos los participantes.
 */
export function AiSuggestionReview({
  suggestion,
  isApplying,
  onApply,
  onDiscard,
}: AiSuggestionReviewProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">{suggestion.explanation}</p>

      {suggestion.operations.length > 0 && (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[11px] font-mono text-foreground">
          {suggestion.operations.map((operation, index) => (
            <li key={`${operation.type}-${index}`} className="truncate">
              {describeOperation(operation)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          disabled={isApplying || suggestion.operations.length === 0}
          onClick={onApply}
        >
          <Check className="h-3.5 w-3.5" />
          Aplicar {suggestion.operations.length} operaciones
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscard} disabled={isApplying}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
