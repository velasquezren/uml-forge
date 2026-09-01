import { createFileRoute, Navigate } from '@tanstack/react-router';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { useAuthStore } from '@/stores/auth.store';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/projects" />;
  }

  return (
    <AuthLayout
      title="Crear Cuenta"
      description="Registrate para comenzar a crear modelos UML colaborativos"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
