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
import { registerSchema, type RegisterFormData } from './auth.schema';

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setStoragePersisted = useAuthStore((s) => s.setStoragePersisted);
  const navigate = useNavigate();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('auth/register', { json: values }).json<AuthResponse>();

      setAuth(response.user, response.accessToken);
      toast.success('Cuenta creada exitosamente');

      const { persisted } = await requestPersistentStorage();
      setStoragePersisted(persisted);

      void navigate({ to: '/projects' });
    } catch (err) {
      if (err instanceof Error && 'response' in err) {
        toast.error('No se pudo registrar la cuenta. El correo podria estar ya en uso.');
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Ana Garcia"
                  autoComplete="name"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electronico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="ana@ejemplo.com"
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
                  placeholder="Min. 8 caracteres con mayuscula y numero"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full mt-2" disabled={isLoading}>
          {isLoading ? 'Creando cuenta...' : 'Registrarse'}
        </Button>

        <div className="text-center text-sm text-muted-foreground pt-2">
          Ya tienes una cuenta?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Inicia sesion aqui
          </Link>
        </div>
      </form>
    </Form>
  );
}
