import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Loader2,
  Package,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { downloadSpringBootZip } from './backendApi';
import { defaultBackendOptions, toPackageName, type BackendOptions } from './backendOptions';

interface GenerateBackendDialogProps {
  projectId: string;
  projectName?: string;
  /** Sin modelo cargado no hay nada que generar y el boton queda inhabilitado. */
  hasModel: boolean;
}

interface SuccessInfo {
  fileName: string;
  fileCount: number;
}

/**
 * Accion "Generar backend" de la barra del editor: pide a la API el proyecto
 * Spring Boot del modelo vivo, lo descarga comprimido y ofrece la guia de ejecucion.
 */
export function GenerateBackendDialog({
  projectId,
  projectName,
  hasModel,
}: GenerateBackendDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<BackendOptions>(() => defaultBackendOptions(projectName));
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // El nombre del proyecto llega despues de la primera consulta a la API.
  useEffect(() => {
    if (!open) {
      setOptions(defaultBackendOptions(projectName));
      setSuccessInfo(null);
      setCopied(false);
    }
  }, [projectName, open]);

  const updateGroupId = useCallback((groupId: string) => {
    setOptions((current) => ({
      ...current,
      groupId,
      packageName: toPackageName(groupId, current.artifactId),
    }));
  }, []);

  const updateArtifactId = useCallback((artifactId: string) => {
    setOptions((current) => ({
      ...current,
      artifactId,
      packageName: toPackageName(current.groupId, artifactId),
    }));
  }, []);

  const handleCopyCommand = useCallback((textToCopy: string) => {
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Comando copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const result = await downloadSpringBootZip(projectId, options);
    setIsGenerating(false);

    if (result.ok) {
      toast.success(`Backend generado: ${result.fileName} con ${result.fileCount} ficheros`);
      setSuccessInfo({ fileName: result.fileName, fileCount: result.fileCount });
      return;
    }
    toast.error(`No se pudo generar el backend: ${result.error}`);
  }, [projectId, options]);

  const runCommand = `mvn spring-boot:run`;
  const fullUnzipAndRun = successInfo
    ? `unzip ${successInfo.fileName} && cd ${options.artifactId} && mvn spring-boot:run`
    : `unzip ${options.artifactId}.zip && cd ${options.artifactId} && mvn spring-boot:run`;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={() => setOpen(true)}
        disabled={!hasModel}
        title="Generar el backend Spring Boot del modelo"
      >
        <Package className="h-4 w-4" />
        <span className="hidden md:inline">Generar backend</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          {successInfo ? (
            // Vista de exito con guia paso a paso para ejecutar el backend
            <div className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <DialogTitle className="text-lg font-bold">
                  ¡Backend descargado con éxito!
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Se generó <strong>{successInfo.fileName}</strong> con {successInfo.fileCount} ficheros
                  listos para compilar y ejecutar.
                </DialogDescription>
              </div>

              {/* Caja de instrucciones de ejecucion */}
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Terminal className="h-4 w-4 text-primary" />
                    <span>Comandos para iniciar el backend:</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                    onClick={() => handleCopyCommand(fullUnzipAndRun)}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar todo'}</span>
                  </Button>
                </div>

                <div className="bg-background/90 rounded border border-border/80 p-2.5 font-mono text-[11px] space-y-1 overflow-x-auto select-all">
                  <div className="text-muted-foreground"># 1. Descomprimir el archivo</div>
                  <div className="text-foreground font-medium">unzip {successInfo.fileName}</div>
                  <div className="text-muted-foreground mt-1"># 2. Ingresar a la carpeta</div>
                  <div className="text-foreground font-medium">cd {options.artifactId}</div>
                  <div className="text-muted-foreground mt-1"># 3. Compilar y correr Spring Boot</div>
                  <div className="text-primary font-bold">mvn spring-boot:run</div>
                </div>

                <div className="space-y-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>
                      <strong>Creación automática de BD:</strong> Hibernate crea automáticamente todas las
                      tablas, relaciones y restricciones JPA en el arranque.
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>
                      <strong>Servidor:</strong> Disponible en{' '}
                      <code className="text-primary font-mono">http://localhost:{options.serverPort}</code>.
                    </span>
                  </p>
                  {options.database === 'h2' ? (
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>
                        <strong>Consola Web H2:</strong> En{' '}
                        <code className="text-primary font-mono">
                          http://localhost:{options.serverPort}/h2-console
                        </code>{' '}
                        (JDBC: <code className="font-mono">jdbc:h2:mem:{options.artifactId}</code>,
                        Usuario: <code className="font-mono">sa</code>).
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold">ℹ</span>
                      <span>
                        <strong>PostgreSQL:</strong> Requiere base de datos en{' '}
                        <code className="font-mono">localhost:5432/{options.artifactId}</code>.
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setSuccessInfo(null)}>
                  Modificar configuración
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Entendido y cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // Formulario de configuracion antes de descargar
            <>
              <DialogHeader>
                <DialogTitle>Generar backend Spring Boot</DialogTitle>
                <DialogDescription>
                  Se genera un proyecto Maven con entidades JPA, repositorios, servicios,
                  controladores REST y Swagger a partir del modelo actual.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="codegen-group-id">Grupo Maven</Label>
                  <Input
                    id="codegen-group-id"
                    value={options.groupId}
                    onChange={(event) => updateGroupId(event.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="codegen-artifact-id">Artefacto</Label>
                  <Input
                    id="codegen-artifact-id"
                    value={options.artifactId}
                    onChange={(event) => updateArtifactId(event.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="codegen-package">Paquete raiz</Label>
                  <Input
                    id="codegen-package"
                    value={options.packageName}
                    onChange={(event) =>
                      setOptions((current) => ({ ...current, packageName: event.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="codegen-database">Base de datos</Label>
                    <Select
                      value={options.database}
                      onValueChange={(value) =>
                        setOptions((current) => ({
                          ...current,
                          database: value === 'h2' ? 'h2' : 'postgresql',
                        }))
                      }
                    >
                      <SelectTrigger id="codegen-database">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h2">H2 en memoria (Sin instalación)</SelectItem>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="codegen-port">Puerto</Label>
                    <Input
                      id="codegen-port"
                      type="number"
                      value={options.serverPort}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          serverPort: Number(event.target.value) || current.serverPort,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Tarjeta guia con el comando de ejecucion */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      <span>Comando para ejecutar el proyecto:</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:text-primary"
                      onClick={() => handleCopyCommand(runCommand)}
                    >
                      {copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </Button>
                  </div>

                  <div className="bg-background/90 rounded border border-border/80 px-2.5 py-1.5 font-mono text-[11px] text-primary font-bold flex items-center justify-between select-all">
                    <span>{runCommand}</span>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1">
                      <Database className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>
                        {options.database === 'h2'
                          ? 'Crea la base de datos y tablas automáticamente en memoria al arrancar.'
                          : 'Hibernate crea las tablas automáticamente en PostgreSQL al arrancar.'}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">
                      Requisitos: Java 21 LTS y Maven 3.9+ instalados.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={isGenerating} onClick={() => void handleGenerate()}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isGenerating ? 'Generando...' : 'Generar y descargar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

