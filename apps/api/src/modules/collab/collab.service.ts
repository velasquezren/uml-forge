import type { Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  Server,
  type onAuthenticatePayload,
  type onLoadDocumentPayload,
  type onStoreDocumentPayload,
} from '@hocuspocus/server';
import * as Y from 'yjs';
import { ApiConfigService } from '../../config/config.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CollabUserContext {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
}

@Injectable()
export class CollabService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollabService.name);
  private server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ApiConfigService,
  ) {}

  onModuleInit() {
    this.server = new Server({
      debounce: 2000,
      maxDebounce: 10000,
      quiet: true,
      onAuthenticate: (data: onAuthenticatePayload) => this.handleAuthenticate(data),
      onLoadDocument: (data: onLoadDocumentPayload) => this.handleLoadDocument(data),
      onStoreDocument: (data: onStoreDocumentPayload) => this.handleStoreDocument(data),
    });
    this.logger.log('Servidor Hocuspocus inicializado para colaboracion Yjs');
  }

  async onModuleDestroy() {
    if (this.server) {
      await this.server.destroy();
    }
  }

  attach(httpServer: unknown) {
    const server = httpServer as HttpServer;
    server.on('upgrade', (request, socket: Duplex, head: Buffer) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/collab' || url.pathname.startsWith('/collab/')) {
        const serverInternal = this.server as unknown as {
          crossws: {
            handleUpgrade: (req: unknown, sock: Duplex, head: Buffer) => Promise<void>;
          };
        };
        void serverInternal.crossws.handleUpgrade(request, socket, head);
      }
    });
  }

  async handleAuthenticate(data: onAuthenticatePayload): Promise<{ user: CollabUserContext }> {
    const token = data.token;
    const projectId = data.documentName;

    if (!token) {
      throw new UnauthorizedException('Token de autenticacion no provisto');
    }

    let payload: { sub: string; email: string };
    try {
      const secret = this.configService.jwtAccessSecret;
      payload = this.jwtService.verify<{ sub: string; email: string }>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Token JWT invalido o expirado');
    }

    const userId = payload.sub;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!project) {
      throw new UnauthorizedException('El proyecto especificado no existe');
    }

    const isOwner = project.ownerId === userId;
    const member = project.members[0];

    if (!isOwner && !member) {
      throw new UnauthorizedException('No tienes permisos de acceso a este proyecto');
    }

    const role: 'OWNER' | 'EDITOR' | 'VIEWER' = isOwner ? 'OWNER' : (member?.role ?? 'VIEWER');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
    };
  }

  async handleLoadDocument(data: onLoadDocumentPayload): Promise<Y.Doc> {
    const projectId = data.documentName;
    const record = await this.prisma.yDocState.findUnique({
      where: { projectId },
    });

    if (record?.state && record.state.length > 0) {
      Y.applyUpdate(data.document, new Uint8Array(record.state));
    }

    return data.document;
  }

  async handleStoreDocument(data: onStoreDocumentPayload): Promise<void> {
    const projectId = data.documentName;
    const state = Y.encodeStateAsUpdate(data.document);

    await this.prisma.yDocState.upsert({
      where: { projectId },
      update: { state: Buffer.from(state) },
      create: { projectId, state: Buffer.from(state) },
    });
  }
}
