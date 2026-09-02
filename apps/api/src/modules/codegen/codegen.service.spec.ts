import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { applyOperationToYDoc, createEmptyModel, createId, writeModel } from '@uml-forge/uml-core';
import type { PrismaService } from '../../prisma/prisma.service';
import { CodegenService } from './codegen.service';

/** Construye el estado binario de un documento Yjs con una clase generable. */
function buildYDocState(): Buffer {
  const ydoc = new Y.Doc();
  writeModel(ydoc, createEmptyModel('Clinica Veterinaria', { id: createId() }));

  const classId = createId();
  applyOperationToYDoc(ydoc, {
    type: 'addClass',
    class: { id: classId, name: 'Owner', position: { x: 0, y: 0 } },
  });
  applyOperationToYDoc(ydoc, {
    type: 'addAttribute',
    classId,
    attribute: { id: createId(), name: 'fullName', type: 'String', visibility: 'private' },
  });

  return Buffer.from(Y.encodeStateAsUpdate(ydoc));
}

describe('CodegenService', () => {
  let service: CodegenService;
  let prismaMock: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    yDocState: { findUnique: ReturnType<typeof vi.fn> };
    generationJob: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prismaMock = {
      project: { findUnique: vi.fn() },
      yDocState: { findUnique: vi.fn() },
      generationJob: {
        create: vi.fn().mockResolvedValue({ id: 'job-1' }),
        update: vi.fn().mockResolvedValue({ id: 'job-1' }),
      },
    };
    service = new CodegenService(prismaMock as unknown as PrismaService);
  });

  it('lanza NotFoundException si el proyecto no existe', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(service.generateSpringBoot('missing', 'user-1', {})).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.generationJob.create).not.toHaveBeenCalled();
  });

  it('rechaza la generacion cuando el proyecto no tiene modelo guardado', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', name: 'Vacio' });
    prismaMock.yDocState.findUnique.mockResolvedValue(null);

    await expect(service.generateSpringBoot('p1', 'user-1', {})).rejects.toThrow(
      BadRequestException,
    );
    // El intento fallido queda registrado en la bitacora de generaciones.
    expect(prismaMock.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('genera un ZIP con el proyecto Spring Boot y registra el trabajo', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', name: 'Clinica Veterinaria' });
    prismaMock.yDocState.findUnique.mockResolvedValue({ state: buildYDocState() });

    const archive = await service.generateSpringBoot('p1', 'user-1', {
      groupId: 'com.umlforge',
      artifactId: 'clinica',
      packageName: 'com.umlforge.clinica',
    });

    expect(archive.fileName).toBe('clinica.zip');
    expect(archive.fileCount).toBeGreaterThan(5);
    expect(archive.options.packageName).toBe('com.umlforge.clinica');
    // Firma local de un fichero ZIP: PK\x03\x04
    expect(archive.buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(prismaMock.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', resultUrl: 'clinica.zip' }),
      }),
    );
  });
});
