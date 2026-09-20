import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusBadge } from './SyncStatusBadge';

describe('SyncStatusBadge', () => {
  it('renderiza Sincronizado cuando esta online y sin cambios pendientes', () => {
    render(<SyncStatusBadge isOnline={true} pendingCount={0} isSyncing={false} />);
    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
  });

  it('renderiza Reconectando... cuando isSyncing es true', () => {
    render(<SyncStatusBadge isOnline={true} pendingCount={2} isSyncing={true} />);
    expect(screen.getByText('Reconectando...')).toBeInTheDocument();
  });

  it('renderiza Sin conexion, N cambios pendientes cuando esta offline o hay cambios', () => {
    render(<SyncStatusBadge isOnline={false} pendingCount={3} isSyncing={false} />);
    expect(screen.getByText(/Sin conexion, 3 cambios pendientes/i)).toBeInTheDocument();
  });
});
