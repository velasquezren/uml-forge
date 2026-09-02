import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { apiClient, type AuthResponse } from '@/lib/api';
import { requestPersistentStorage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth.store';
import { loginSchema, type LoginFormData } from './auth.schema';

/** Contrasena comun de los usuarios que crea `pnpm seed`. */
const SEED_PASSWORD = 'password123';

/** Usuarios de prueba con su rol en los proyectos semilla. */
const SEED_USERS = [
  { label: 'Admin', email: 'admin@admin.com', role: 'Propietario' },
  { label: 'Demo', email: 'demo@umlforge.dev', role: 'Editor' },
  { label: 'Test', email: 'user@user.com', role: 'Lector' },
] as const;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setStoragePersisted = useAuthStore((s) => s.setStoragePersisted);
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@admin.com',
      password: 'password123',
    },
  });

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('auth/login', { json: values }).json<AuthResponse>();

      setAuth(response.user, response.accessToken);
      toast.success(`Bienvenido, ${response.user.name}`);

      // Solicitar almacenamiento persistente para modelos offline y pesos de IA
      const { persisted } = await requestPersistentStorage();
      setStoragePersisted(persisted);

      void navigate({ to: '/projects' });
    } catch (err) {
      if (err instanceof Error && 'response' in err) {
        toast.error('Credenciales incorrectas. Verifica tu correo y contrasena.');
      } else {
        toast.error('Error de conexion con el servidor');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /** Entra directamente con uno de los usuarios semilla. */
  const loginAs = (email: string) => {
    form.setValue('email', email);
    form.setValue('password', SEED_PASSWORD);
    void form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2 text-muted-foreground">
          <div className="font-medium text-foreground">
            Acceso rapido con los datos de <code className="font-mono text-primary">pnpm seed</code>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SEED_USERS.map((seedUser) => (
              <Button
                key={seedUser.email}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex-col gap-0 text-[11px] leading-tight"
                disabled={isLoading}
                onClick={() => loginAs(seedUser.email)}
              >
                <span className="font-semibold">{seedUser.label}</span>
                <span className="text-[9px] text-muted-foreground">{seedUser.role}</span>
              </Button>
            ))}
          </div>
          <div>
            Todos con la contrasena{' '}
            <code className="font-mono text-primary font-semibold">{SEED_PASSWORD}</code>. Abre dos
            navegadores con usuarios distintos para ver los cursores en vivo.
          </div>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electronico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="ejemplo@umlforge.dev"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contrasena</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full mt-2" disabled={isLoading}>
          {isLoading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
        </Button>

        <div className="text-center text-sm text-muted-foreground pt-2">
          No tienes una cuenta?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Registrate aqui
          </Link>
        </div>
      </form>
    </Form>
  );
}
