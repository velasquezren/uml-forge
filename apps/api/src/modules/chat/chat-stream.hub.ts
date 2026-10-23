import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatStreamEvent } from './chat.types';
import { CHAT_EVENT_BUS, type ChatBusEvent, type ChatEventBus } from './events/chat-event-bus';

type StreamListener = (event: ChatStreamEvent) => void;

/**
 * Reparte los eventos del bus entre las conexiones abiertas en esta instancia.
 * Cada mensaje se lee de la base de datos una sola vez por instancia, por
 * muchas personas que esten conectadas al proyecto (ADR 0042).
 */
@Injectable()
export class ChatStreamHub implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatStreamHub.name);
  private readonly listeners = new Map<string, Set<StreamListener>>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly chat: ChatService,
    @Inject(CHAT_EVENT_BUS) private readonly bus: ChatEventBus,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.bus.subscribe((event) => {
      this.dispatch(event).catch((error: unknown) => {
        this.logger.warn(`No se pudo repartir un evento del chat: ${String(error)}`);
      });
    });
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  /** Alta de una conexion a un proyecto; devuelve la baja. */
  subscribe(projectId: string, listener: StreamListener): () => void {
    const set = this.listeners.get(projectId) ?? new Set<StreamListener>();
    set.add(listener);
    this.listeners.set(projectId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(projectId);
    };
  }

  /** Conexiones abiertas en esta instancia; para diagnostico y pruebas. */
  connectionCount(projectId: string): number {
    return this.listeners.get(projectId)?.size ?? 0;
  }

  private async dispatch(event: ChatBusEvent): Promise<void> {
    const targets = this.listeners.get(event.projectId);
    if (targets === undefined || targets.size === 0) {
      return;
    }

    let streamEvent: ChatStreamEvent;
    if (event.type === 'assistant') {
      streamEvent = {
        type: 'assistant',
        data: { state: event.state, askedBy: event.askedBy, draft: event.draft ?? null },
      };
    } else {
      const message = await this.chat.get(event.messageId);
      if (message === null) return;
      streamEvent = { type: 'message', data: message };
    }

    for (const listener of targets) {
      listener(streamEvent);
    }
  }
}
