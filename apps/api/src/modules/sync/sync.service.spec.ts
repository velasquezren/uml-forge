import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import * as Y from 'yjs';
import { createEmptyModel, createId, writeModel } from '@uml-forge/uml-core';
import type { PrismaService } from '../../prisma/prisma.service';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;
  let prismaMock: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    operationLog: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    yDocState: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prismaMock = {
      project: {
        findUnique: vi.fn(),
      },
      operationLog: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      yDocState: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    service = new SyncService(prismaMock as unknown as PrismaService);
  });

  it('lanza NotFoundException si el proyecto no existe', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      service.applyBatch(createId(), createId(), {
        clientId: createId(),
        batchId: createId(),
        operations: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('devuelve resultados cacheados para un batchId ya procesado (idempotencia)', async () => {
    const projId = createId();
    const batchId = createId();
    prismaMock.project.findUnique.mockResolvedValue({ id: projId, name: 'Test' });
    prismaMock.operationLog.findMany.mockResolvedValue([
      {
        status: 'applied',
        operation: { seq: 1, opType: 'addClass', existingId: undefined, reason: undefined },
      },
    ]);

    const res = await service.applyBatch(projId, createId(), {
      clientId: createId(),
      batchId,
      operations: [
        { seq: 1, op: { type: 'addClass', class: { id: createId(), name: 'Mascota' } } },
      ],
    });

    expect(res.batchId).toBe(batchId);
    expect(res.results).toHaveLength(1);
    expect(res.results[0]?.status).toBe('applied');
    expect(prismaMock.yDocState.upsert).not.toHaveBeenCalled();
  });

  it('Politica 1: devuelve skipped_duplicate con existingId si la clase ya existe', async () => {
    const projId = createId();
    const existingClassId = createId();
    prismaMock.project.findUnique.mockResolvedValue({ id: projId, name: 'Test' });
    prismaMock.operationLog.findMany.mockResolvedValue([]);

    const doc = new Y.Doc();
    const model = createEmptyModel('Test', { id: projId });
    model.classes.push({
      id: existingClassId,
      name: 'Veterinario',
      isAbstract: false,
      isInterface: false,
      stereotypes: [],
      position: { x: 0, y: 0 },
      attributes: [],
      operations: [],
    });
    writeModel(doc, model);

    prismaMock.yDocState.findUnique.mockResolvedValue({
      projectId: projId,
      state: Buffer.from(Y.encodeStateAsUpdate(doc)),
    });
    prismaMock.operationLog.create.mockResolvedValue({});
    prismaMock.yDocState.upsert.mockResolvedValue({});

    const res = await service.applyBatch(projId, createId(), {
      clientId: createId(),
      batchId: createId(),
      operations: [
        {
          seq: 1,
          op: {
            type: 'addClass',
            class: { id: createId(), name: 'Veterinario' },
          },
        },
      ],
    });

    expect(res.results[0]?.status).toBe('skipped_duplicate');
    expect(res.results[0]?.existingId).toBe(existingClassId);
  });

  it('Politica 2: devuelve conflict si la operacion referencia una clase inexistente', async () => {
    const projId = createId();
    prismaMock.project.findUnique.mockResolvedValue({ id: projId, name: 'Test' });
    prismaMock.operationLog.findMany.mockResolvedValue([]);
    prismaMock.yDocState.findUnique.mockResolvedValue(null);
    prismaMock.operationLog.create.mockResolvedValue({});
    prismaMock.yDocState.upsert.mockResolvedValue({});

    const res = await service.applyBatch(projId, createId(), {
      clientId: createId(),
      batchId: createId(),
      operations: [
        {
          seq: 1,
          op: {
            type: 'addAttribute',
            classId: createId(),
            attribute: {
              id: createId(),
              name: 'precio',
              type: 'Double',
            },
          },
        },
      ],
    });

    expect(res.results[0]?.status).toBe('conflict');
  });

  it('Politica 3: aplica operacion valida y persiste estado binario', async () => {
    const projId = createId();
    prismaMock.project.findUnique.mockResolvedValue({ id: projId, name: 'Test' });
    prismaMock.operationLog.findMany.mockResolvedValue([]);
    prismaMock.yDocState.findUnique.mockResolvedValue(null);
    prismaMock.operationLog.create.mockResolvedValue({});
    prismaMock.yDocState.upsert.mockResolvedValue({});

    const res = await service.applyBatch(projId, createId(), {
      clientId: createId(),
      batchId: createId(),
      operations: [
        {
          seq: 1,
          op: {
            type: 'addClass',
            class: { id: createId(), name: 'Paciente' },
          },
        },
      ],
    });

    expect(res.results[0]?.status).toBe('applied');
    expect(prismaMock.yDocState.upsert).toHaveBeenCalled();
  });
});
