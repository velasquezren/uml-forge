/** Evento de un flujo Server-Sent Events. */
export interface SseEvent {
  readonly event: string;
  readonly data: string;
}

/**
 * Lector incremental de Server-Sent Events. El `EventSource` del navegador no
 * permite enviar la cabecera `Authorization`, asi que el flujo se lee con
 * `fetch` y se trocea aqui: los fragmentos de red pueden cortar un evento por
 * la mitad, y el lector guarda lo pendiente hasta la linea en blanco que lo
 * cierra.
 */
export class SseParser {
  private buffer = '';

  push(chunk: string): SseEvent[] {
    this.buffer += chunk.replace(/\r\n/gu, '\n');
    const events: SseEvent[] = [];

    let boundary = this.buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const event = parseBlock(block);
      if (event !== null) events.push(event);
      boundary = this.buffer.indexOf('\n\n');
    }
    return events;
  }
}

function parseBlock(block: string): SseEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    // Las lineas que empiezan por ':' son comentarios (latidos).
    if (line === '' || line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /u, '');
    if (field === 'event') event = value;
    if (field === 'data') data.push(value);
  }
  return data.length === 0 ? null : { event, data: data.join('\n') };
}
