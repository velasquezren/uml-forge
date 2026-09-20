import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type ProjectDto } from '@/lib/api';

const updateProjectSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
});

export type UpdateProjectFormData = z.infer<typeof updateProjectSchema>;

interface ProjectBasicInfoFormProps {
  project: ProjectDto;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (values: UpdateProjectFormData) => void;
}

export function ProjectBasicInfoForm({
  project,
  canEdit,
  isSaving,
  onSave,
}: ProjectBasicInfoFormProps) {
  const form = useForm<UpdateProjectFormData>({
    resolver: zodResolver(updateProjectSchema),
    values: {
      name: project.name,
      description: project.description || '',
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalles del Proyecto</CardTitle>
        <CardDescription>Informacion general del modelo de dominio.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Input disabled={!canEdit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canEdit && (
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
