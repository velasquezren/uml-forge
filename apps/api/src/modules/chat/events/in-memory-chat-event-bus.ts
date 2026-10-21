import type { ChatBusEvent, ChatBusListener, ChatEventBus } from './chat-event-bus';

/**
 * Bus dentro del proceso. Suficiente con una sola instancia de la API, que es
 * como se despliega mientras la colaboracion Yjs viva en memoria (ADR 0041).
 */
export class InMemoryChatEventBus implements ChatEventBus {
  private readonly listeners = new Set<ChatBusListener>();

  publish(event: ChatBusEvent): Promise<void> {
    for (const listener of this.listeners) {
      listener(event);
    }
    return Promise.resolve();
  }

  subscribe(listener: ChatBusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
