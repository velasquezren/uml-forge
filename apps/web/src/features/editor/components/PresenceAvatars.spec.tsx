import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceAvatars } from './PresenceAvatars';
import { initialsFor } from '../lib/presence';
import type { UserAwarenessState } from '../types';

function remote(id: string, name: string): UserAwarenessState {
  return { user: { id, name, color: '#38bdf8' } };
}

describe('PresenceAvatars', () => {
  it('calcula las iniciales de un nombre', () => {
    expect(initialsFor('Ada Lovelace')).toBe('AL');
    expect(initialsFor('grace')).toBe('G');
    expect(initialsFor('   ')).toBe('?');
  });

  it('muestra al usuario local y a los participantes remotos', () => {
    render(
      <PresenceAvatars
        remoteUsers={[remote('u2', 'Ada Lovelace'), remote('u3', 'Grace Hopper')]}
        currentUserName="Alan Turing"
      />,
    );

    expect(screen.getByText('AT')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('GH')).toBeInTheDocument();
    expect(screen.getByText('3 en linea')).toBeInTheDocument();
  });

  it('agrupa los participantes que no caben en un contador', () => {
    const many = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio'].map((name, index) =>
      remote(`u${index}`, name),
    );

    render(<PresenceAvatars remoteUsers={many} currentUserName="Alan Turing" />);

    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('7 en linea')).toBeInTheDocument();
  });
});
