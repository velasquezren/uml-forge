import { Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiConfigModule } from '../../config/config.module';
import { ApiConfigService } from '../../config/config.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { CollabModule } from '../collab/collab.module';
import { ChatAssistantService } from './chat-assistant.service';
import { ChatStreamHub } from './chat-stream.hub';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CHAT_EVENT_BUS, type ChatEventBus } from './events/chat-event-bus';
import { InMemoryChatEventBus } from './events/in-memory-chat-event-bus';
import { PostgresChatEventBus } from './events/postgres-chat-event-bus';

/**
 * Elige el bus de eventos con `CHAT_EVENT_BUS`: en memoria para una sola
 * instancia, o PostgreSQL `LISTEN/NOTIFY` para repartir los mensajes entre
 * varias instancias de la API sin anadir infraestructura (ADR 0042).
 */
async function createEventBus(config: ApiConfigService): Promise<ChatEventBus> {
  if (config.chatEventBus === 'postgres') {
    const bus = new PostgresChatEventBus(config.databaseUrl);
    await bus.start();
    return bus;
  }
  new Logger('ChatModule').log('Bus del chat en memoria (una sola instancia)');
  return new InMemoryChatEventBus();
}

@Module({
  imports: [ApiConfigModule, PrismaModule, AiModule, CollabModule],
  controllers: [ChatController],
  providers: [
    { provide: CHAT_EVENT_BUS, inject: [ApiConfigService], useFactory: createEventBus },
    ChatService,
    ChatAssistantService,
    ChatStreamHub,
  ],
  exports: [ChatService],
})
export class ChatModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const bus = this.moduleRef.get<ChatEventBus>(CHAT_EVENT_BUS);
    if (bus instanceof PostgresChatEventBus) {
      await bus.stop();
    }
  }
}
