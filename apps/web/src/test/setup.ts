import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock de Link y hooks de navegacion de TanStack Router para entorno jsdom
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-router');
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => React.createElement('a', { href: to || '#', ...props }, children),
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: 'proj-1' }),
  };
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
