import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, PencilRuler, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssistantLayoutProps {
  projectId: string;
  projectName?: string;
  /** Resumen del modelo vivo, para ver el efecto de lo que dicta la IA. */
  summaryContent?: ReactNode;
  children: ReactNode;
}

/**
 * Pantalla minimalista del asistente: sin paleta ni lienzo de edicion manual,
 * pensada para modelar hablando y ver el resultado en el resumen.
 */
export function AssistantLayout({
  projectId,
  projectName = 'Proyecto UML',
  summaryContent,
  children,
}: AssistantLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex min-w-0 items-center space-x-3">
          <Link to="/projects" className="shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </Button>
          </Link>
          <div className="h-4 w-px shrink-0 bg-border" />
          <span className="truncate text-sm font-semibold tracking-tight" title={projectName}>
            {projectName}
          </span>
        </div>

        <Link to="/projects/$projectId/editor" params={{ projectId }}>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
            <PencilRuler className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir el lienzo</span>
          </Button>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Asistente de modelado
        </div>
        {children}
        {summaryContent}
      </main>
    </div>
  );
}
