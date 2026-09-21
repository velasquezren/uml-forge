import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobilePwaGuideDialog } from './MobilePwaGuideDialog';

describe('MobilePwaGuideDialog', () => {
  it('renderiza el boton de la guia PWA', () => {
    render(<MobilePwaGuideDialog />);
    expect(screen.getByRole('button', { name: /app movil pwa/i })).toBeInTheDocument();
  });

  it('abre el dialogo y muestra las pestanas de explicacion al hacer clic', () => {
    render(<MobilePwaGuideDialog />);

    fireEvent.click(screen.getByRole('button', { name: /app movil pwa/i }));

    expect(screen.getByText('UML Forge Movil (PWA)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /instalacion/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /flujo con ia/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /arquitectura/i })).toBeInTheDocument();
  });
});
