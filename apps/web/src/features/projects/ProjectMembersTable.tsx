import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Trash2, UserPlus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ProjectDto } from '@/lib/api';

const addMemberSchema = z.object({
  email: z.string().email('Introduce un correo electronico valido'),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

export type AddMemberFormData = z.infer<typeof addMemberSchema>;

interface ProjectMembersTableProps {
  project: ProjectDto;
  isOwner: boolean;
  isAddingMember: boolean;
  onAddMember: (values: AddMemberFormData) => void;
  onUpdateRole: (userId: string, role: 'OWNER' | 'EDITOR' | 'VIEWER') => void;
  onRemoveMember: (userId: string) => void;
}

export function ProjectMembersTable({
  project,
  isOwner,
  isAddingMember,
  onAddMember,
  onUpdateRole,
  onRemoveMember,
}: ProjectMembersTableProps) {
  const memberForm = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: '',
      role: 'EDITOR',
    },
  });

  const handleAdd = (values: AddMemberFormData) => {
    onAddMember(values);
    memberForm.reset();
  };

  const collaboratorMembers =
    project.members?.filter(
      (m) => m.userId !== project.ownerId && m.userId !== project.owner?.id,
    ) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Colaboradores y Permisos</CardTitle>
        <CardDescription>
          Gestiona quienes pueden ver o editar este diagrama de clases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isOwner && (
          <Form {...memberForm}>
            <form
              onSubmit={memberForm.handleSubmit(handleAdd)}
              className="flex flex-col sm:flex-row gap-3 items-end border-b border-border pb-6"
            >
              <FormField
                control={memberForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Correo del Colaborador</FormLabel>
                    <FormControl>
                      <Input placeholder="colaborador@umlforge.dev" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={memberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="w-full sm:w-40">
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Lector</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isAddingMember} className="gap-1.5 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
                <span>{isAddingMember ? 'Añadiendo...' : 'Añadir'}</span>
              </Button>
            </form>
          </Form>
        )}

        <div className="divide-y divide-border">
          {/* Fila fija para el propietario */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">{project.owner?.name || 'Propietario'}</div>
              <div className="text-xs text-muted-foreground">{project.owner?.email}</div>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
              <Shield className="h-3.5 w-3.5" />
              <span>Propietario</span>
            </div>
          </div>

          {/* Lista de colaboradores adicionales */}
          {collaboratorMembers.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground italic">
              No hay colaboradores adicionales en este proyecto.
            </div>
          ) : (
            collaboratorMembers.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{member.user.name}</div>
                  <div className="text-xs text-muted-foreground">{member.user.email}</div>
                </div>

                <div className="flex items-center space-x-3">
                  {isOwner ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(newRole) =>
                          onUpdateRole(member.userId, newRole as 'OWNER' | 'EDITOR' | 'VIEWER')
                        }
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="VIEWER">Lector</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => onRemoveMember(member.userId)}
                        aria-label="Eliminar colaborador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        member.role === 'EDITOR'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {member.role === 'EDITOR' ? 'Editor' : 'Lector'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
