import { useCallback, useRef, useState } from 'react';
import type { UMLModel } from '@uml-forge/uml-core';
import type { XmiVersionInfo } from '@uml-forge/xmi';
import { Download, Lock, Upload } from 'lucide-react';
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
import { describeEditLock, type EditLock } from '@/features/editor/lib/editLock';
import { describeImportVersion } from './versionNotice';
import { downloadModelAsXmi, readXmiFile, XMI_ACCEPT } from './xmiFile';

interface XmiActionsProps {
  model: UMLModel | null;
  /** Bloqueo por edicion en curso: mientras dura no se exporta ni se importa. */
  lock: EditLock;
  /** Revision actual del modelo compartido. */
  revision: number;
  onReplaceModel: (model: UMLModel) => void;
}

interface PendingImport {
  model: UMLModel;
  fileName: string;
  version: XmiVersionInfo | null;
}

/**
 * Interoperabilidad XMI 2.1 desde la barra del editor: exporta el modelo vivo a
 * un fichero e importa el de una herramienta CASE externa. La importacion
 * reemplaza el modelo completo, de modo que se confirma antes de aplicarla.
 *
 * Ambas acciones esperan a que nadie este editando (ADR 0034): exportar a
 * mitad de un cambio dejaria un fichero con el modelo a medias, e importar
 * pisaria el trabajo que otra persona esta haciendo en ese momento.
 */
export function XmiActions({ model, lock, revision, onReplaceModel }: XmiActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const lockMessage = describeEditLock(lock);
  const lockHint = lock.locked ? ` (bloqueado: ${lockMessage.toLowerCase()})` : '';

  const handleExport = useCallback(() => {
    if (!model) {
      toast.error('El modelo todavia no esta cargado');
      return;
    }
    if (lock.locked) {
      toast.warning(`${lockMessage}. Espera a que termine para exportar.`);
      return;
    }
    const result = downloadModelAsXmi(model, revision);
    if (result.ok) {
      toast.success(`Version ${revision} exportada a ${result.fileName}`);
    } else {
      toast.error(`No se pudo exportar: ${result.error}`);
    }
  }, [model, lock.locked, lockMessage, revision]);

  const handleFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Se limpia el input para poder reimportar el mismo fichero mas tarde.
      event.target.value = '';
      if (!file) {
        return;
      }

      const result = await readXmiFile(file, model?.name ?? 'Modelo importado');
      if (!result.ok) {
        toast.error(`Importacion fallida: ${result.error}`);
        return;
      }
      setPendingImport({ model: result.model, fileName: file.name, version: result.version });
    },
    [model],
  );

  const confirmImport = useCallback(() => {
    if (!pendingImport || lock.locked) {
      return;
    }
    onReplaceModel(pendingImport.model);
    toast.success(
      `Importadas ${pendingImport.model.classes.length} clases y ` +
        `${pendingImport.model.relationships.length} relaciones como version ${revision + 1}`,
    );
    setPendingImport(null);
  }, [pendingImport, lock.locked, onReplaceModel, revision]);

  const versionNotice = pendingImport
    ? describeImportVersion(pendingImport.version, model?.id ?? null, revision)
    : null;

  return (
    <>
      <span
        className="hidden items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex"
        title="Revision actual del modelo compartido"
        aria-label={`Version ${revision} del modelo`}
      >
        {lock.locked && <Lock className="h-3 w-3" aria-hidden />}v{revision}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={handleExport}
        disabled={lock.locked}
        title={`Exportar el modelo a XMI 2.1 compatible con Enterprise Architect${lockHint}`}
      >
        <Download className="h-4 w-4" />
        <span className="hidden md:inline">Exportar XMI</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={lock.locked}
        title={`Importar un fichero XMI 2.1${lockHint}`}
      >
        <Upload className="h-4 w-4" />
        <span className="hidden md:inline">Importar XMI</span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept={XMI_ACCEPT}
        className="hidden"
        aria-label="Fichero XMI a importar"
        onChange={(event) => void handleFileSelected(event)}
      />

      <Dialog open={pendingImport !== null} onOpenChange={() => setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reemplazar el modelo actual</DialogTitle>
            <DialogDescription>
              {pendingImport
                ? `El fichero ${pendingImport.fileName} contiene ${pendingImport.model.classes.length} clases, ` +
                  `${pendingImport.model.enums.length} enumeraciones y ` +
                  `${pendingImport.model.relationships.length} relaciones. Al importar se sustituye todo el ` +
                  'contenido del diagrama para todos los participantes.'
                : ''}
            </DialogDescription>
          </DialogHeader>
          {versionNotice && (
            <p
              className={
                versionNotice.warning
                  ? 'rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400'
                  : 'text-xs text-muted-foreground'
              }
            >
              {versionNotice.text}
            </p>
          )}
          {lock.locked && (
            <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              {lockMessage}. La importacion se habilita cuando termine.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingImport(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmImport} disabled={lock.locked}>
              Reemplazar e importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
