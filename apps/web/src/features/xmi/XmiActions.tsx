import { useCallback, useRef, useState } from 'react';
import type { UMLModel } from '@uml-forge/uml-core';
import { Download, Upload } from 'lucide-react';
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
import { downloadModelAsXmi, readXmiFile, XMI_ACCEPT } from './xmiFile';

interface XmiActionsProps {
  model: UMLModel | null;
  onReplaceModel: (model: UMLModel) => void;
}

/**
 * Interoperabilidad XMI 2.1 desde la barra del editor: exporta el modelo vivo a
 * un fichero e importa el de una herramienta CASE externa. La importacion
 * reemplaza el modelo completo, de modo que se confirma antes de aplicarla.
 */
export function XmiActions({ model, onReplaceModel }: XmiActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ model: UMLModel; fileName: string } | null>(
    null,
  );

  const handleExport = useCallback(() => {
    if (!model) {
      toast.error('El modelo todavia no esta cargado');
      return;
    }
    const result = downloadModelAsXmi(model);
    if (result.ok) {
      toast.success('Modelo exportado a XMI 2.1');
    } else {
      toast.error(`No se pudo exportar: ${result.error}`);
    }
  }, [model]);

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
      setPendingImport({ model: result.model, fileName: file.name });
    },
    [model],
  );

  const confirmImport = useCallback(() => {
    if (!pendingImport) {
      return;
    }
    onReplaceModel(pendingImport.model);
    toast.success(
      `Importadas ${pendingImport.model.classes.length} clases y ` +
        `${pendingImport.model.relationships.length} relaciones`,
    );
    setPendingImport(null);
  }, [pendingImport, onReplaceModel]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={handleExport}
        title="Exportar el modelo a XMI 2.1"
      >
        <Download className="h-4 w-4" />
        <span className="hidden md:inline">Exportar XMI</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={() => fileInputRef.current?.click()}
        title="Importar un fichero XMI 2.1"
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
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingImport(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmImport}>
              Reemplazar e importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
