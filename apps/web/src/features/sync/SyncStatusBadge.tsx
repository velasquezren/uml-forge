import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SyncStatusBadgeProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onManualSync?: () => void;
}

export function SyncStatusBadge({
  isOnline,
  pendingCount,
  isSyncing,
  onManualSync,
}: SyncStatusBadgeProps) {
  if (isSyncing) {
    return (
      <div className="flex items-center space-x-1.5 text-amber-500 font-medium animate-pulse">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Reconectando...</span>
      </div>
    );
  }

  if (!isOnline || pendingCount > 0) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-medium">
          <CloudOff className="h-3.5 w-3.5" />
          <span>
            Sin conexion, {pendingCount}{' '}
            {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
          </span>
        </div>
        {isOnline && pendingCount > 0 && onManualSync && (
          <Button
            variant="outline"
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={onManualSync}
          >
            Sincronizar ahora
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Sincronizado</span>
    </div>
  );
}
