import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectDangerZoneProps {
  isDeleting: boolean;
  onDeleteProject: () => void;
}

export function ProjectDangerZone({ isDeleting, onDeleteProject }: ProjectDangerZoneProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-lg text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zona de Peligro
        </CardTitle>
        <CardDescription>
          Eliminar el proyecto borrara permanentemente todos los modelos, diagramas y snapshots Yjs
          asociados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={onDeleteProject}
          disabled={isDeleting}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>{isDeleting ? 'Eliminando...' : 'Eliminar este proyecto'}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
