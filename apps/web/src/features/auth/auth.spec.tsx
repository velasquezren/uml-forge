import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

describe('Auth Forms', () => {
  it('renderiza el formulario de login con campos email y password', () => {
    renderWithProviders(<LoginForm />);

    expect(screen.getByLabelText(/Correo Electronico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contrasena/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Sesion/i })).toBeInTheDocument();
  });

  it('renderiza el formulario de registro con campos name, email y password', () => {
    renderWithProviders(<RegisterForm />);

    expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electronico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contrasena/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrarse/i })).toBeInTheDocument();
  });
});
