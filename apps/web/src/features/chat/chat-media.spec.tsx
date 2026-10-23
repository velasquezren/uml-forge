import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formatDuration } from './attachmentFiles';
import { ChatAttachmentView } from './ChatAttachmentView';
import { ChatComposer } from './ChatComposer';
import { ChatPanel } from './ChatPanel';
import type * as ChatClientModule from './chatClient';
import type { useProjectChat } from './useProjectChat';

vi.mock('./chatClient', async (original) => ({
  ...(await original<typeof ChatClientModule>()),
  attachmentUrl: vi.fn().mockResolvedValue('blob:nota'),
}));

describe('caja de escritura del chat', () => {
  it('Enter envia y Mayusculas+Enter no', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatComposer onSend={onSend} />);
    const box = screen.getByLabelText('Mensaje para el chat del equipo');

    fireEvent.change(box, { target: { value: 'hola equipo' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('hola equipo', false, undefined));
  });

  it('no envia mientras se compone un acento', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatComposer onSend={onSend} />);
    const box = screen.getByLabelText('Mensaje para el chat del equipo');
    fireEvent.change(box, { target: { value: 'cancio' } });
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('adjunta una imagen y la quita', async () => {
    render(<ChatComposer onSend={vi.fn()} />);
    const input = screen.getByLabelText('Fichero para adjuntar al chat');
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'diagrama.png', { type: 'image/png' })] },
    });
    expect(await screen.findByAltText('Imagen a enviar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el adjunto' }));
    expect(screen.queryByAltText('Imagen a enviar')).toBeNull();
  });
});

describe('nota de voz en un mensaje', () => {
  const audio = {
    id: 'a1',
    kind: 'AUDIO' as const,
    mimeType: 'audio/webm',
    sizeBytes: 100,
    durationMs: 42000,
  };

  it('avisa mientras se transcribe y muestra la transcripcion despues', async () => {
    const { rerender } = render(
      <ChatAttachmentView projectId="p" attachment={audio} transcript={null} />,
    );
    expect(await screen.findByText(/Transcribiendo la nota de voz/u)).toBeInTheDocument();

    rerender(<ChatAttachmentView projectId="p" attachment={audio} transcript="falta Factura" />);
    expect(screen.getByText('"falta Factura"')).toBeInTheDocument();
    // Sin reproducir, el reproductor muestra la duracion guardada al grabar.
    expect(screen.getByText('0:42')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reproducir la nota de voz' })).toBeInTheDocument();
  });

  it('formatea la duracion', () => {
    expect(formatDuration(185000)).toBe('3:05');
  });
});

describe('respuesta de la IA en directo', () => {
  it('muestra lo que la IA lleva escrito', () => {
    const chat = {
      messages: [],
      hasMore: false,
      connected: true,
      error: null,
      unread: 0,
      assistant: { state: 'thinking', askedBy: 'Ana', draft: 'Ana, el modelo tiene' },
      loadOlder: vi.fn(),
      send: vi.fn(),
      resolve: vi.fn(),
      askAgain: vi.fn(),
    } as unknown as ReturnType<typeof useProjectChat>;

    render(<ChatPanel chat={chat} currentUserId="u1" canEdit />);
    expect(screen.getByText('respondiendo a Ana')).toBeInTheDocument();
    expect(screen.getByText('Ana, el modelo tiene')).toBeInTheDocument();
  });
});

describe('conversacion con la IA', () => {
  it('avisa de que la respuesta llegara a la IA cuando esta pregunto algo', () => {
    const base = {
      projectId: 'p',
      mentionsAi: false,
      isError: false,
      proposal: null,
      attachment: null,
      transcript: null,
    };
    const chat = {
      messages: [
        {
          ...base,
          id: 'q',
          kind: 'USER',
          author: { id: 'u1', name: 'Ana' },
          content: 'en que consiste el proyecto',
          replyTo: null,
          createdAt: '2026-10-22T10:00:00Z',
        },
        {
          ...base,
          id: 'r',
          kind: 'ASSISTANT',
          author: null,
          content: 'Ana, es un sistema academico. ¿Deseas anadir algo?',
          replyTo: { id: 'q', authorName: 'Ana' },
          createdAt: '2026-10-22T10:00:05Z',
        },
      ],
      hasMore: false,
      connected: true,
      error: null,
      unread: 0,
      assistant: { state: 'idle', askedBy: null },
      loadOlder: vi.fn(),
      send: vi.fn(),
      resolve: vi.fn(),
      askAgain: vi.fn(),
    } as unknown as ReturnType<typeof useProjectChat>;

    const { rerender } = render(<ChatPanel chat={chat} currentUserId="u1" canEdit />);
    expect(
      screen.getByPlaceholderText('Responde a la IA: te contestara sin necesidad de @ia'),
    ).toBeInTheDocument();

    // A otra persona no se le indica nada: la pregunta no era para ella.
    rerender(<ChatPanel chat={chat} currentUserId="u2" canEdit />);
    expect(screen.getByPlaceholderText('Escribe al equipo (o usa @ia)')).toBeInTheDocument();
  });
});
