import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
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

/**
 * Accion "Generar backend" de la barra del editor: pide a la API el proyecto
 * Spring Boot del modelo vivo y lo descarga comprimido.
 */
export function GenerateBackendDialog({
  projectId,
  projectName,
  hasModel,
}: GenerateBackendDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<BackendOptions>(() => defaultBackendOptions(projectName));

  // El nombre del proyecto llega despues de la primera consulta a la API.
  useEffect(() => {
    if (!open) {
      setOptions(defaultBackendOptions(projectName));
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

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const result = await downloadSpringBootZip(projectId, options);
    setIsGenerating(false);

    if (result.ok) {
      toast.success(`Backend generado: ${result.fileName} con ${result.fileCount} ficheros`);
      setOpen(false);
      return;
    }
    toast.error(`No se pudo generar el backend: ${result.error}`);
  }, [projectId, options]);

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar backend Spring Boot</DialogTitle>
            <DialogDescription>
              Se genera un proyecto Maven con entidades JPA, repositorios, servicios, controladores
              REST y Swagger a partir del modelo actual.
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
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="h2">H2 en memoria</SelectItem>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
