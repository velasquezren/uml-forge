import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatProposal } from './chatTypes';

/** Lineas del resumen que se ven sin desplegar. */
const VISIBLE_LINES = 8;

interface ChatProposalCardProps {
  proposal: ChatProposal;
  canEdit: boolean;
  onResolve: (action: 'apply' | 'dismiss') => Promise<void>;
}

/** Texto del estado una vez resuelta la propuesta. */
function resolution(proposal: ChatProposal): string {
  const who = proposal.resolvedBy?.name ?? 'alguien';
  if (proposal.status === 'DISMISSED') return `Descartada por ${who}`;
  const result = proposal.result;
  if (result === null) return `Aplicada por ${who}`;
  const skipped =
    result.failed > 0 ? `; ${result.failed} omitidos (ya estaban en el modelo o no encajaban)` : '';
  return `Aplicada por ${who}: ${result.applied} cambios${skipped}`;
}

/**
 * Propuesta de cambios de la IA dentro del chat. Todos ven que cambiaria; solo
 * quien puede editar el modelo la aplica o la descarta, y la primera persona
 * que lo hace la resuelve para todos (ADR 0042).
 */
export function ChatProposalCard({ proposal, canEdit, onResolve }: ChatProposalCardProps) {
  const [busy, setBusy] = useState<'apply' | 'dismiss' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const lines = expanded ? proposal.summary : proposal.summary.slice(0, VISIBLE_LINES);
  const hidden = proposal.summary.length - lines.length;

  const run = async (action: 'apply' | 'dismiss') => {
    setBusy(action);
    try {
      await onResolve(action);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-background/60 p-2.5">
      <p className="text-xs font-medium">
        Propuesta: {proposal.operationCount} cambios en el modelo
      </p>
      <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
        {lines.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          className="text-[11px] text-primary hover:underline"
          onClick={() => setExpanded(true)}
        >
          y {hidden} mas
        </button>
      )}

      {proposal.status === 'PENDING' ? (
        canEdit ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 gap-1 text-xs"
              disabled={busy !== null}
              onClick={() => void run('apply')}
            >
              {busy === 'apply' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Aplicar al modelo
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={busy !== null}
              onClick={() => void run('dismiss')}
            >
              <X className="h-3.5 w-3.5" />
              Descartar
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Pendiente: la puede aplicar un editor del proyecto.
          </p>
        )
      ) : (
        <p className="text-[11px] text-muted-foreground">{resolution(proposal)}</p>
      )}
    </div>
  );
}
