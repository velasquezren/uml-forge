import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  type MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  Sse,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RequireProjectRoles } from '../../common/decorators/project-role.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard';
import { ChatStreamHub } from './chat-stream.hub';
import { ChatService } from './chat.service';
import type { ChatMessageDto, ChatPageDto } from './chat.types';
import { ListChatMessagesDto } from './dto/list-chat-messages.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

/** Latido del flujo: evita que proxies y balanceadores corten la conexion inactiva. */
const HEARTBEAT_MS = 20_000;

/**
 * Chat de grupo de un proyecto con la IA como participante (ADR 0042). Leer y
 * escribir esta permitido a todos los miembros; aplicar o descartar una
 * propuesta de cambios del modelo, solo a quien puede editarlo.
 */
@ApiTags('chat')
@ApiBearerAuth('JWT')
@Controller('projects/:id/chat')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly hub: ChatStreamHub,
  ) {}

  @Get('messages')
  @RequireProjectRoles(ProjectRole.VIEWER)
  @ApiOperation({ summary: 'Historial del chat, de 50 en 50 hacia atras' })
  list(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: ListChatMessagesDto,
  ): Promise<ChatPageDto> {
    return this.chat.list(projectId, query);
  }

  @Post('messages')
  @RequireProjectRoles(ProjectRole.VIEWER)
  @ApiOperation({ summary: 'Escribir en el chat; con @ia o askAi responde la IA' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Mensaje publicado para todos' })
  send(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendChatMessageDto,
  ): Promise<ChatMessageDto> {
    return this.chat.send(projectId, { id: user.id, name: user.name }, dto);
  }

  @Post('messages/:messageId/ask-again')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireProjectRoles(ProjectRole.VIEWER)
  @ApiOperation({ summary: 'Pedir a la IA que vuelva a responder a un mensaje' })
  async askAgain(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.chat.askAgain(projectId, messageId, user.name);
  }

  @Get('attachments/:attachmentId')
  @RequireProjectRoles(ProjectRole.VIEWER)
  @ApiOperation({ summary: 'Contenido de una imagen o nota de voz del chat' })
  async attachment(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.chat.attachment(projectId, attachmentId);
    // Un adjunto no cambia nunca: el navegador puede guardarlo indefinidamente.
    response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return new StreamableFile(file.data, { type: file.mimeType, length: file.data.length });
  }

  @Post('messages/:messageId/proposal/apply')
  @HttpCode(HttpStatus.OK)
  @RequireProjectRoles(ProjectRole.EDITOR)
  @ApiOperation({ summary: 'Aplicar al modelo la propuesta de la IA' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Ya se aplico o se descarto' })
  apply(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ChatMessageDto> {
    return this.chat.applyProposal(projectId, messageId, userId);
  }

  @Post('messages/:messageId/proposal/dismiss')
  @HttpCode(HttpStatus.OK)
  @RequireProjectRoles(ProjectRole.EDITOR)
  @ApiOperation({ summary: 'Descartar la propuesta de la IA' })
  dismiss(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ChatMessageDto> {
    return this.chat.dismissProposal(projectId, messageId, userId);
  }

  @Sse('stream')
  @Header('X-Accel-Buffering', 'no')
  @RequireProjectRoles(ProjectRole.VIEWER)
  @ApiOperation({ summary: 'Mensajes y estado de la IA en tiempo real (Server-Sent Events)' })
  stream(@Param('id', ParseUUIDPipe) projectId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({ type: 'ready', data: { projectId } });
      const unsubscribe = this.hub.subscribe(projectId, (event) => {
        subscriber.next({ type: event.type, data: event.data });
      });
      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'ping', data: {} });
      }, HEARTBEAT_MS);
      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    });
  }
}
