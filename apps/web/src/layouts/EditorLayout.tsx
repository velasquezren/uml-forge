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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface EditorLayoutProps {
  projectId: string;
  projectName?: string;
  paletteContent?: ReactNode;
  treeContent?: ReactNode;
  inspectorContent?: ReactNode;
  syncStatusContent?: ReactNode;
  onUndo?: () => void;
  onRedo?: () => void;
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
  onUndo,
  onRedo,
  onlineUsersCount = 1,
  children,
}: EditorLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const isOnline = useNetworkStatus();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Barra superior de herramientas del editor */}
      <header className="flex h-12 items-center justify-between border-b border-border bg-background px-3 shrink-0">
        <div className="flex items-center space-x-3">
          <Link to="/projects">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-semibold text-sm tracking-tight truncate max-w-[200px] sm:max-w-xs">
            {projectName}
          </span>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Deshacer"
            aria-label="Deshacer"
            onClick={onUndo}
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
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Link to="/projects/$projectId/settings" params={{ projectId }}>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ajustes">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Area central: Panel Izquierdo + Lienzo + Panel Derecho */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Panel izquierdo: Paleta y arbol del modelo */}
        {leftPanelOpen && (
          <aside className="w-64 border-r border-border bg-sidebar-background flex flex-col z-10 shrink-0">
            <Tabs defaultValue="palette" className="flex flex-col h-full">
              <div className="px-3 pt-2 border-b border-border">
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
        <main className="flex-1 relative overflow-hidden bg-dot-grid flex items-center justify-center">
          {children}
        </main>

        {/* Panel derecho: Inspector de propiedades */}
        {rightPanelOpen && (
          <aside className="w-72 border-l border-border bg-sidebar-background p-4 overflow-y-auto z-10 shrink-0">
            <div className="flex items-center space-x-2 pb-3 border-b border-border mb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Propiedades</h3>
            </div>
            {inspectorContent}
          </aside>
        )}
      </div>

      {/* Barra inferior de estado y presencia */}
      <footer className="flex h-7 items-center justify-between border-t border-border bg-background px-3 text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[11px]"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          >
            {leftPanelOpen ? 'Ocultar Paleta' : 'Mostrar Paleta'}
          </Button>
          <div className="h-3 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[11px]"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? 'Ocultar Inspector' : 'Mostrar Inspector'}
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>{onlineUsersCount} en linea</span>
          </div>

          <div className="h-3 w-px bg-border" />

          {syncStatusContent}

          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className="h-3 w-3 text-emerald-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-amber-500" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
