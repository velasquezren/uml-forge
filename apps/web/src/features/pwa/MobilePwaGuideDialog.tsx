import { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Cpu,
  Download,
  Layers,
  Mic,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface MobilePwaGuideDialogProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

/**
 * Dialogo interactivo con guia de instalacion PWA movil, conexion y flujo con IA local.
 */
export function MobilePwaGuideDialog({
  variant = 'outline',
  size = 'sm',
  className = '',
  showText = true,
}: MobilePwaGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1.5 text-xs ${className}`}
          title="Guia de instalacion y uso de la App Movil PWA"
        >
          <Smartphone className="h-3.5 w-3.5" />
          {showText && <span>App Movil PWA</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">UML Forge Movil (PWA)</DialogTitle>
              <DialogDescription className="text-xs">
                Ejecuta la aplicacion en tu celular como app nativa y modela con IA local.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Estado de instalacion PWA */}
        {isInstalled ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-500 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Aplicacion instalada en este dispositivo en modo standalone.</span>
          </div>
        ) : isInstallable ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/10 p-2.5 text-xs">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Download className="h-4 w-4 shrink-0" />
              <span>Navegador compatible detectado para instalacion directa.</span>
            </div>
            <Button size="sm" className="h-7 text-xs" onClick={() => void promptInstall()}>
              Instalar PWA
            </Button>
          </div>
        ) : null}

        <Tabs defaultValue="install" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="install" className="text-xs">
              Instalacion
            </TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs">
              Flujo con IA
            </TabsTrigger>
            <TabsTrigger value="architecture" className="text-xs">
              Arquitectura
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Instalacion en Celular */}
          <TabsContent value="install" className="space-y-3 pt-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Wifi className="h-3.5 w-3.5 text-primary" />
                <span>Paso 1: Conectar el celular a la misma red Wi-Fi</span>
              </div>
              <p>
                Abre el navegador en tu telefono y accede a la direccion IP de tu maquina (ejemplo:{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                  {currentOrigin.replace('localhost', '192.168.x.x')}
                </code>
                ).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="font-semibold text-foreground">Android (Chrome / Edge)</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Toca el menu de tres puntos (menu superior).</li>
                  <li>
                    Selecciona <strong>Instalar aplicacion</strong> o{' '}
                    <strong>Anadir a pantalla principal</strong>.
                  </li>
                  <li>Se anadira el icono de UML Forge a tu lista de apps.</li>
                </ol>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1.5">
                <div className="font-semibold text-foreground">iOS (Safari en iPhone)</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Toca el boton <strong>Compartir</strong> (icono de cuadrado con flecha).
                  </li>
                  <li>
                    Desplaza hacia abajo y pulsa <strong>Anadir a pantalla de inicio</strong>.
                  </li>
                  <li>Confirma el nombre y pulsa Anadir.</li>
                </ol>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[11px]">
              <strong>Ventaja standalone:</strong> Al abrirse desde la pantalla de inicio, la PWA
              funciona a pantalla completa sin barra de navegacion, con cache offline en IndexedDB.
            </div>
          </TabsContent>

          {/* Tab 2: Flujo con IA Movil */}
          <TabsContent value="workflow" className="space-y-3 pt-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>Demostracion para la defensa presencial</span>
              </div>
              <p>
                Puedes tener la computadora proyectando el lienzo grande y utilizar tu celular en la
                mano como centro de entrada multimodal con la IA local:
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">1. Abre el Asistente Movil</div>
                  <p>
                    Desde la lista de proyectos en tu celular, pulsa en <strong>Asistente IA</strong>{' '}
                    para abrir la vista optimizada para pantallas pequenas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                  <Mic className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">2. Dictado por voz nativo</div>
                  <p>
                    Toca el microfono en el celular y dicta tu modelo (ejemplo:{' '}
                    <em>&quot;Crea la clase Cliente con id y nombre&quot;</em>). Usa la Web Speech
                    API del telefono.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">3. Foto a boceto con camara</div>
                  <p>
                    Toca el boton de imagen en el celular para activar la camara y fotografiar un
                    diagrama en papel o pizarra. Ollama lo analizara mediante el modelo multimodal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border p-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">4. Sincronizacion Yjs en vivo</div>
                  <p>
                    Al aprobar las operaciones en el celular, el diagrama se actualiza de inmediato
                    en la pantalla de la computadora gracias a los CRDTs.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Arquitectura y Capacitor */}
          <TabsContent
            value="architecture"
            className="space-y-3 pt-2 text-xs text-muted-foreground"
          >
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="font-semibold text-foreground">
                ¿Por que PWA frente a una aplicacion nativa aislada?
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Unica base de codigo:</strong> La logica de negocio y el metamodelo UML se
                  mantienen en TypeScript estricto sin bifurcar en otro lenguaje.
                </li>
                <li>
                  <strong>Soporte sin conexion:</strong> Service Worker precachea los recursos y
                  guarda modelos en IndexedDB.
                </li>
                <li>
                  <strong>Despliegue instantaneo:</strong> No requiere aprobacion ni comisiones de
                  tiendas de aplicaciones.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <div className="font-semibold text-foreground">
                ¿Y si el evaluador exige un archivo APK?
              </div>
              <p>
                La PWA esta lista para empaquetarse con <strong>Capacitor</strong> sin modificar el
                codigo:
              </p>
              <pre className="rounded bg-background p-2 font-mono text-[11px] text-foreground overflow-x-auto border border-border">
                pnpm --filter @uml-forge/web add @capacitor/core @capacitor/cli @capacitor/android
                {'\n'}
                npx cap init &quot;UML Forge&quot; dev.umlforge.app --web-dir dist{'\n'}
                npx cap add android{'\n'}
                npx cap open android
              </pre>
              <p className="text-[11px]">
                Esto genera un proyecto nativo de Android Studio directamente a partir del build de
                Vite.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
