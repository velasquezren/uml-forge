import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  FolderTree,
  Palette as PaletteIcon,
  Redo2,
  SlidersHorizontal,
  Undo2,
  Users,
  Wifi,
  WifiOff,
  Settings,
  Moon,
  Sun,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompactEditor } from '@/hooks/useMediaQuery';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';
import { useEditorPanels } from './useEditorPanels';

interface EditorLayoutProps {
  projectId: string;
  projectName?: string;
  paletteContent?: ReactNode;
  treeContent?: ReactNode;
  inspectorContent?: ReactNode;
  syncStatusContent?: ReactNode;
  /** Acciones propias de la barra superior, como la interoperabilidad XMI. */
  actionsContent?: ReactNode;
  /** Presencia de los participantes; si falta se muestra solo el contador. */
  presenceContent?: ReactNode;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onlineUsersCount?: number;
  children: ReactNode;
}

export function EditorLayout({
  projectId,
  projectName = 'Proyecto UML',
  paletteContent,
  treeContent,
  inspectorContent,
  syncStatusContent,
  actionsContent,
  presenceContent,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onlineUsersCount = 1,
  children,
}: EditorLayoutProps) {
  const compact = useCompactEditor();
  const panels = useEditorPanels(compact);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
  );
  const isOnline = useNetworkStatus();

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Barra superior de herramientas del editor */}
      <header className="flex h-12 items-center justify-between border-b border-border bg-background px-3 shrink-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <Link to="/projects" className="shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-border shrink-0" />
          <Button
            variant={panels.leftOpen ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={panels.toggleLeft}
            aria-label={panels.leftOpen ? 'Ocultar paleta' : 'Mostrar paleta'}
            aria-pressed={panels.leftOpen}
            title={panels.leftOpen ? 'Ocultar paleta y arbol' : 'Mostrar paleta y arbol'}
          >
            {panels.leftOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          <span
            className="font-semibold text-sm tracking-tight truncate max-w-[200px] sm:max-w-md"
            title={projectName}
          >
            {projectName}
          </span>
        </div>

        <div className="flex shrink-0 items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Deshacer"
            aria-label="Deshacer"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Rehacer"
            aria-label="Rehacer"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          {actionsContent}
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link to="/projects/$projectId/settings" params={{ projectId }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Ajustes"
              title="Ajustes del proyecto"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant={panels.rightOpen ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={panels.toggleRight}
            aria-label={panels.rightOpen ? 'Ocultar inspector' : 'Mostrar inspector'}
            aria-pressed={panels.rightOpen}
            title={panels.rightOpen ? 'Ocultar propiedades' : 'Mostrar propiedades'}
          >
            {panels.rightOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Area central: Panel Izquierdo + Lienzo + Panel Derecho */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Panel izquierdo: Paleta y arbol del modelo */}
        {/* En modo compacto los paneles flotan sobre el lienzo en vez de estrecharlo. */}
        {panels.leftOpen && (
          <aside
            className={cn(
              'w-64 border-r border-border bg-sidebar-background flex flex-col shrink-0',
              compact ? 'absolute inset-y-0 left-0 z-30 max-w-[85%] shadow-2xl' : 'z-10',
            )}
          >
            <Tabs defaultValue="palette" className="flex flex-col h-full">
              <div className="flex items-center gap-1 px-3 pt-2 border-b border-border">
                <TabsList className="w-full grid grid-cols-2 h-8">
                  <TabsTrigger value="palette" className="text-xs gap-1">
                    <PaletteIcon className="h-3.5 w-3.5" />
                    Paleta
                  </TabsTrigger>
                  <TabsTrigger value="tree" className="text-xs gap-1">
                    <FolderTree className="h-3.5 w-3.5" />
                    Arbol
                  </TabsTrigger>
                </TabsList>
                {compact && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={panels.closeLeft}
                    aria-label="Cerrar paleta"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <TabsContent value="palette" className="flex-1 p-3 overflow-y-auto m-0">
                {paletteContent}
              </TabsContent>

              <TabsContent value="tree" className="flex-1 p-3 overflow-y-auto m-0">
                {treeContent}
              </TabsContent>
            </Tabs>
          </aside>
        )}

        {/* Lienzo central interactivo */}
        <main className="flex-1 relative h-full w-full overflow-hidden bg-dot-grid">
          <div className="absolute inset-0 w-full h-full">{children}</div>
        </main>

        {/* Panel derecho: Inspector de propiedades */}
        {panels.rightOpen && (
          <aside
            className={cn(
              'w-72 border-l border-border bg-sidebar-background p-4 overflow-y-auto shrink-0',
              compact ? 'absolute inset-y-0 right-0 z-30 max-w-[85%] shadow-2xl' : 'z-10',
            )}
          >
            <div className="flex items-center space-x-2 pb-3 border-b border-border mb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h3 className="flex-1 text-sm font-semibold">Propiedades</h3>
              {compact && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={panels.closeRight}
                  aria-label="Cerrar inspector"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {inspectorContent}
          </aside>
        )}
      </div>

      {/* Barra inferior de estado y presencia */}
      <footer className="flex h-7 items-center justify-between border-t border-border bg-background px-3 text-[11px] text-muted-foreground shrink-0">
        <div className="ml-auto flex items-center space-x-3 sm:space-x-4">
          {presenceContent ?? (
            <div className="flex items-center space-x-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{onlineUsersCount} en linea</span>
            </div>
          )}

          <div className="h-3 w-px bg-border" />

          {syncStatusContent}

          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className="h-3 w-3 text-emerald-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-amber-500" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
