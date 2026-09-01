import { createFileRoute, Navigate } from '@tanstack/react-router';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/projects" />;
  }

  return (
    <AuthLayout
      title="Iniciar Sesion"
      description="Ingresa tus credenciales para acceder a tus proyectos"
    >
      <LoginForm />
    </AuthLayout>
  );
}
