import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  applyOperationToYDoc,
  createEmptyModel,
  fromYDoc,
  parseOperation,
  writeModel,
  type UMLModel,
  type UmlOperation,
} from '@uml-forge/uml-core';
import * as Y from 'yjs';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  OperationResultDto,
  OperationStatus,
  SyncOperationsDto,
  SyncResponseDto,
} from './dto/sync-operations.dto';

interface SavedLogRecord {
  status: string;
  operation: unknown;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyBatch(
    projectId: string,
    userId: string,
    dto: SyncOperationsDto,
  ): Promise<SyncResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    // 1. Idempotencia: si el batch ya fue procesado, devolvemos el resultado previo
    const existingLogs = (await this.prisma.operationLog.findMany({
      where: { projectId, batchId: dto.batchId },
      orderBy: { appliedAt: 'asc' },
    })) as unknown as SavedLogRecord[];

    if (existingLogs.length > 0) {
      this.logger.log(`Batch ${dto.batchId} ya procesado previamente. Devolviendo logs guardados.`);
      const cachedResults: OperationResultDto[] = existingLogs.map((log, index) => {
        const opData = log.operation as {
          seq?: number;
          opType?: string;
          existingId?: string;
          reason?: string;
        };
        return {
          seq: opData.seq ?? index + 1,
          status: log.status as OperationStatus,
          opType: opData.opType ?? 'unknown',
          existingId: opData.existingId,
          reason: opData.reason,
        };
      });
      return { batchId: dto.batchId, results: cachedResults };
    }

    // 2. Cargar YDoc vivo desde Prisma
    const record = await this.prisma.yDocState.findUnique({
      where: { projectId },
    });

    const ydoc = new Y.Doc();
    if (record?.state && record.state.length > 0) {
      Y.applyUpdate(ydoc, new Uint8Array(record.state));
    } else {
      writeModel(ydoc, createEmptyModel(project.name, { id: projectId }));
    }

    let modelResult = fromYDoc(ydoc);
    let currentModel: UMLModel = modelResult.ok
      ? modelResult.value
      : createEmptyModel(project.name, { id: projectId });

    const results: OperationResultDto[] = [];

    // 3. Procesar cada operacion aplicando las tres politicas de conflicto
    for (const item of dto.operations) {
      const parseRes = parseOperation(item.op);

      if (!parseRes.ok) {
        results.push({
          seq: item.seq,
          status: 'conflict',
          opType: 'invalid',
          reason: `Operacion invalida: ${parseRes.error.message}`,
        });
        continue;
      }

      const op = parseRes.value;
      const opResult = this.evaluateAndApply(ydoc, currentModel, op);

      results.push({
        seq: item.seq,
        status: opResult.status,
        opType: op.type,
        existingId: opResult.existingId,
        reason: opResult.reason,
      });

      // Si la operacion fue aplicada, actualizamos el modelo en memoria
      if (opResult.status === 'applied') {
        modelResult = fromYDoc(ydoc);
        if (modelResult.ok) {
          currentModel = modelResult.value;
        }
      }

      // Registro en OperationLog
      const logPayload = {
        seq: item.seq,
        opType: op.type,
        existingId: opResult.existingId,
        reason: opResult.reason,
        payload: item.op,
      } as unknown as Prisma.InputJsonValue;

      await this.prisma.operationLog.create({
        data: {
          projectId,
          userId,
          batchId: dto.batchId,
          clientId: dto.clientId,
          status: opResult.status,
          operation: logPayload,
        },
      });
    }

    // 4. Persistir estado binario actualizado
    const state = Y.encodeStateAsUpdate(ydoc);
    await this.prisma.yDocState.upsert({
      where: { projectId },
      update: { state: Buffer.from(state) },
      create: { projectId, state: Buffer.from(state) },
    });

    return {
      batchId: dto.batchId,
      results,
    };
  }

  private evaluateAndApply(
    ydoc: Y.Doc,
    model: UMLModel,
    op: UmlOperation,
  ): { status: OperationStatus; existingId?: string; reason?: string } {
    // Politica 1: Clase creada con nombre ya existente -> skipped_duplicate
    if (op.type === 'addClass') {
      const existing = model.classes.find(
        (c) => c.name.toLowerCase().trim() === op.class.name.toLowerCase().trim(),
      );
      if (existing) {
        return {
          status: 'skipped_duplicate',
          existingId: existing.id,
          reason: `Una clase con el nombre '${op.class.name}' ya existe en el modelo`,
        };
      }
    }

    // Politica 2: Operacion que referencia un elemento borrado -> conflict
    if (op.type === 'addAttribute' || op.type === 'addOperation') {
      const parentClass = model.classes.find((c) => c.id === op.classId);
      if (!parentClass) {
        return {
          status: 'conflict',
          reason: `La clase contenedora con id '${op.classId}' no existe o fue eliminada`,
        };
      }
    }

    if (op.type === 'addRelationship') {
      const src = model.classes.find((c) => c.id === op.relationship.sourceId);
      const tgt = model.classes.find((c) => c.id === op.relationship.targetId);
      if (!src || !tgt) {
        return {
          status: 'conflict',
          reason: 'El origen o destino de la relacion no existe o fue eliminado',
        };
      }
    }

    // Politica 3: Aplicacion sobre Y.Doc y mapeo estricto de codigos de error
    const applyRes = applyOperationToYDoc(ydoc, op);

    if (applyRes.ok) {
      return { status: 'applied' };
    }

    const code = applyRes.error.code;
    if (code === 'duplicate_name') {
      return {
        status: 'skipped_duplicate',
        reason: applyRes.error.message,
      };
    }

    return {
      status: 'conflict',
      reason: applyRes.error.message,
    };
  }
}
