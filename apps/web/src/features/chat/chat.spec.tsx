import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatProposalCard } from './ChatProposalCard';
import type { ChatMessage, ChatProposal } from './chatTypes';
import { SseParser } from './sse';
import { mergeMessages } from './useProjectChat';

describe('lector de Server-Sent Events', () => {
  it('reconstruye un evento partido entre dos fragmentos de red', () => {
    const parser = new SseParser();
    expect(parser.push('event: message\ndata: {"id":')).toEqual([]);
    expect(parser.push('"m1"}\n\nevent: ping\ndata: {}\n\n')).toEqual([
      { event: 'message', data: '{"id":"m1"}' },
      { event: 'ping', data: '{}' },
    ]);
  });

  it('ignora comentarios y acepta saltos de linea CRLF', () => {
    const parser = new SseParser();
    expect(parser.push(': latido\r\n\r\ndata: hola\r\n\r\n')).toEqual([
      { event: 'message', data: 'hola' },
    ]);
  });
});

function message(id: string, createdAt: string, content = id): ChatMessage {
  return {
    id,
    projectId: 'p',
    kind: 'USER',
    author: { id: 'u1', name: 'Ana' },
    content,
    mentionsAi: false,
    isError: false,
    replyTo: null,
    proposal: null,
    createdAt,
  };
}

describe('historial del chat', () => {
  it('mezcla sin duplicar, sustituye actualizaciones y ordena por fecha', () => {
    const current = [message('b', '2026-10-20T10:01:00Z'), message('c', '2026-10-20T10:02:00Z')];
    const merged = mergeMessages(current, [
      message('a', '2026-10-20T10:00:00Z'),
      message('c', '2026-10-20T10:02:00Z', 'editado'),
    ]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(merged[2]?.content).toBe('editado');
  });
});

const proposal: ChatProposal = {
  explanation: 'Clase Factura',
  summary: ['Nueva clase Factura', 'Factura: + total (BigDecimal)'],
  operationCount: 2,
  status: 'PENDING',
  resolvedBy: null,
  resolvedAt: null,
  result: null,
};

describe('tarjeta de propuesta', () => {
  it('un editor puede aplicarla', () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    render(<ChatProposalCard proposal={proposal} canEdit onResolve={onResolve} />);
    expect(screen.getByText('Nueva clase Factura')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aplicar al modelo/u }));
    expect(onResolve).toHaveBeenCalledWith('apply');
  });

  it('un lector solo ve que esta pendiente', () => {
    render(<ChatProposalCard proposal={proposal} canEdit={false} onResolve={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Aplicar/u })).toBeNull();
    expect(screen.getByText(/la puede aplicar un editor/u)).toBeInTheDocument();
  });

  it('una vez aplicada dice quien y cuantos cambios entraron', () => {
    render(
      <ChatProposalCard
        proposal={{
          ...proposal,
          status: 'APPLIED',
          resolvedBy: { id: 'u2', name: 'Luis' },
          result: { applied: 2, failed: 1 },
        }}
        canEdit
        onResolve={vi.fn()}
      />,
    );
    expect(
      screen.getByText('Aplicada por Luis: 2 cambios; 1 ya no encajaban en el modelo'),
    ).toBeInTheDocument();
  });
});
