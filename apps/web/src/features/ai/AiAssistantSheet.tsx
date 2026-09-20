import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Mic, Sparkles } from 'lucide-react';
import type { Result, UMLModel, UmlError, UmlOperationInput } from '@uml-forge/uml-core';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AiAssistantPanel } from './AiAssistantPanel';

interface AiAssistantSheetProps {
  projectId: string;
  model: UMLModel | null;
  applyOperation?: (op: UmlOperationInput) => Result<UMLModel, UmlError>;
}

/** Abre el asistente de IA en un panel lateral, sin salir del lienzo. */
export function AiAssistantSheet({ projectId, model, applyOperation }: AiAssistantSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        disabled={!applyOperation}
        onClick={() => setOpen(true)}
        title="Asistente de IA: dicta, escribe o sube un diagrama"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden md:inline">Asistente IA</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Asistente de modelado</SheetTitle>
            <SheetDescription>
              Describe el dominio y la IA propone clases, atributos y relaciones. Nada se aplica
              hasta que lo confirmes.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
            {applyOperation && <AiAssistantPanel model={model} applyOperation={applyOperation} />}
            <Link to="/projects/$projectId/assistant" params={{ projectId }}>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <Mic className="h-3.5 w-3.5" />
                Abrir la pantalla de voz a pantalla completa
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
