import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { AuthLayout } from './AuthLayout';
import { EditorLayout } from './EditorLayout';
import { AppShell } from './AppShell';

describe('Layouts', () => {
  it('renderiza AuthLayout con titulo y descripcion', () => {
    renderWithProviders(
      <AuthLayout title="Iniciar Sesion" description="Acceso a proyectos">
        <div>Contenido Formulario</div>
      </AuthLayout>,
    );

    expect(screen.getByText('Iniciar Sesion')).toBeInTheDocument();
    expect(screen.getByText('Acceso a proyectos')).toBeInTheDocument();
    expect(screen.getByText('Contenido Formulario')).toBeInTheDocument();
  });

  it('renderiza AppShell con navegacion y cabecera', () => {
    renderWithProviders(
      <AppShell>
        <div>Contenido Principal</div>
      </AppShell>,
    );

    expect(screen.getByText('UML Forge')).toBeInTheDocument();
    expect(screen.getByText('Proyectos')).toBeInTheDocument();
    expect(screen.getByText('Contenido Principal')).toBeInTheDocument();
  });

  it('renderiza EditorLayout con paneles y lienzo', () => {
    renderWithProviders(
      <EditorLayout projectId="proj-1" projectName="Clinica Veterinaria">
        <div>Lienzo UML de Prueba</div>
      </EditorLayout>,
    );

    expect(screen.getByText('Clinica Veterinaria')).toBeInTheDocument();
    expect(screen.getByText('Paleta')).toBeInTheDocument();
    expect(screen.getByText('Propiedades')).toBeInTheDocument();
    expect(screen.getByText('Lienzo UML de Prueba')).toBeInTheDocument();
  });
});
