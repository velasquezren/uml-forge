import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  FolderKanban,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { apiClient } from '@/lib/api';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const storagePersisted = useAuthStore((s) => s.storagePersisted);
  const isOnline = useNetworkStatus();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignorado si la red falla
    } finally {
      clearAuth();
      void navigate({ to: '/login' });
    }
  };

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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Barra lateral colapsable */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-sidebar-background transition-all duration-200 lg:static ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              UF
            </div>
            {sidebarOpen && (
              <span className="font-semibold tracking-tight text-foreground truncate">
                UML Forge
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex"
            aria-label="Colapsar barra lateral"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-200 ${
                !sidebarOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <Link
            to="/projects"
            className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{
              className: 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
            }}
          >
            <FolderKanban className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Proyectos</span>}
          </Link>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {sidebarOpen && <span>Estado red</span>}
            <div
              className={`flex items-center space-x-1.5 rounded-full px-2 py-1 ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500 font-medium'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  {sidebarOpen && <span>En linea</span>}
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  {sidebarOpen && <span>Sin conexion</span>}
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Cabecera */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Alternar menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden text-sm font-medium sm:inline-block">
                    {user?.name || user?.email || 'Usuario'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <div className="px-2 py-1 text-xs text-muted-foreground">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Advertencia de almacenamiento persistente no concedido */}
        {storagePersisted === false && (
          <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-500 sm:px-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Atencion: El navegador no ha concedido persistencia de almacenamiento. Los modelos
                guardados offline y pesos de IA podrian ser liberados si el espacio en disco es
                bajo.
              </span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
