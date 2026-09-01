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

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setStoragePersisted = useAuthStore((s) => s.setStoragePersisted);
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
