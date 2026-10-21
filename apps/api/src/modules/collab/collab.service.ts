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
import type { UMLModel, UmlOperation } from '@uml-forge/uml-core';
import * as Y from 'yjs';
import { ApiConfigService } from '../../config/config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { applyOperationsToDoc, modelOf, participantNames, type ApplyReport } from './live-document';

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

  /**
   * Modelo tal como esta ahora mismo en memoria. Hocuspocus guarda en la base de
   * datos con unos segundos de retraso: quien necesite el estado actual (la IA
   * del chat) debe leerlo de aqui y solo recurrir a la base de datos si nadie
   * tiene abierto el proyecto.
   */
  async currentModel(projectId: string): Promise<UMLModel | null> {
    const live = this.server.hocuspocus.documents.get(projectId);
    if (live !== undefined) {
      return modelOf(live);
    }
    const record = await this.prisma.yDocState.findUnique({ where: { projectId } });
    if (!record?.state || record.state.length === 0) {
      return null;
    }
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(record.state));
    return modelOf(doc);
  }

  /** Personas con el proyecto abierto en este momento. */
  participants(projectId: string): string[] {
    const live = this.server.hocuspocus.documents.get(projectId);
    return live === undefined ? [] : participantNames(live.awareness.getStates().values());
  }

  /**
   * Aplica operaciones sobre el documento compartido desde el propio servidor,
   * con una conexion directa de Hocuspocus: el cambio llega por el CRDT a todos
   * los que tienen el lienzo abierto y se guarda aunque no haya nadie (ADR 0042).
   */
  async applyOperations(
    projectId: string,
    operations: readonly UmlOperation[],
    projectName: string,
  ): Promise<ApplyReport> {
    const connection = await this.server.hocuspocus.openDirectConnection(projectId, {});
    let report: ApplyReport = { applied: 0, failed: 0, firstError: null };
    try {
      await connection.transact((doc) => {
        report = applyOperationsToDoc(doc, operations, projectName, projectId);
      });
    } finally {
      await connection.disconnect();
    }
    return report;
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
