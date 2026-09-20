import { useState } from 'react';
import { Check, CheckCircle2, Copy, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import type { BackendOptions } from './backendOptions';

interface BackendSuccessGuideProps {
  successInfo: { fileName: string; fileCount: number };
  options: BackendOptions;
  onModify: () => void;
  onClose: () => void;
}

export function BackendSuccessGuide({
  successInfo,
  options,
  onModify,
  onClose,
}: BackendSuccessGuideProps) {
  const [copied, setCopied] = useState(false);

  const fullUnzipAndRun = `unzip ${successInfo.fileName} && cd ${options.artifactId} && mvn spring-boot:run`;

  const handleCopyCommand = (textToCopy: string) => {
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Comando copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4 py-2">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <DialogTitle className="text-lg font-bold">¡Backend descargado con éxito!</DialogTitle>
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
                (JDBC: <code className="font-mono">jdbc:h2:mem:{options.artifactId}</code>, Usuario:{' '}
                <code className="font-mono">sa</code>).
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
        <Button variant="outline" size="sm" onClick={onModify}>
          Modificar configuración
        </Button>
        <Button size="sm" onClick={onClose}>
          Entendido y cerrar
        </Button>
      </DialogFooter>
    </div>
  );
}
