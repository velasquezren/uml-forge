import { Logger } from '@nestjs/common';
import { Client } from 'pg';
import {
  parseChatBusEvent,
  type ChatBusEvent,
  type ChatBusListener,
  type ChatEventBus,
} from './chat-event-bus';

const CHANNEL = 'uml_forge_chat';
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Bus sobre `LISTEN`/`NOTIFY` de PostgreSQL: cada instancia de la API escucha
 * el mismo canal, de modo que un mensaje escrito en una llega a las personas
 * conectadas a cualquier otra. No anade infraestructura: la base de datos ya
 * existe. Si la conexion se cae, se reabre con espera creciente.
 */
export class PostgresChatEventBus implements ChatEventBus {
  private readonly logger = new Logger(PostgresChatEventBus.name);
  private readonly listeners = new Set<ChatBusListener>();
  private client: Client | null = null;
  private reconnectDelay = 1000;
  private closed = false;

  constructor(private readonly connectionString: string) {}

  async start(): Promise<void> {
    await this.connect();
  }

  async stop(): Promise<void> {
    this.closed = true;
    await this.client?.end().catch(() => undefined);
    this.client = null;
  }

  async publish(event: ChatBusEvent): Promise<void> {
    if (this.client === null) {
      throw new Error('El bus de eventos del chat no esta conectado');
    }
    await this.client.query('SELECT pg_notify($1, $2)', [CHANNEL, JSON.stringify(event)]);
  }

  subscribe(listener: ChatBusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async connect(): Promise<void> {
    const client = new Client({ connectionString: this.connectionString });
    client.on('notification', (message) => {
      const event = message.payload ? parseChatBusEvent(message.payload) : null;
      if (event !== null) {
        for (const listener of this.listeners) listener(event);
      }
    });
    client.on('error', (error) => {
      this.logger.warn(`Conexion del bus del chat perdida: ${error.message}`);
      this.scheduleReconnect(client);
    });
    client.on('end', () => this.scheduleReconnect(client));

    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    this.client = client;
    this.reconnectDelay = 1000;
    this.logger.log('Bus del chat escuchando en PostgreSQL');
  }

  private scheduleReconnect(failed: Client): void {
    if (this.closed || this.client !== failed) return;
    this.client = null;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    setTimeout(() => {
      this.connect().catch((error: unknown) => {
        this.logger.warn(`No se pudo reconectar el bus del chat: ${String(error)}`);
        this.client = failed;
        this.scheduleReconnect(failed);
      });
    }, delay);
  }
}
