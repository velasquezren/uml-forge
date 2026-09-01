import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as Y from 'yjs';
import type { ApiConfigService } from '../../config/config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { CollabService } from './collab.service';

describe('CollabService', () => {
  let service: CollabService;
  let prismaMock: {
    project: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    yDocState: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  };
  let jwtMock: { verify: ReturnType<typeof vi.fn> };
  let configMock: Partial<ApiConfigService>;

  beforeEach(() => {
    prismaMock = {
      project: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      yDocState: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    jwtMock = {
      verify: vi.fn(),
    };

    configMock = {
      jwtAccessSecret: 'test-secret',
    };

    service = new CollabService(
      prismaMock as unknown as PrismaService,
      jwtMock as unknown as JwtService,
      configMock as ApiConfigService,
    );
    service.onModuleInit();
  });

  describe('handleAuthenticate', () => {
    it('lanza UnauthorizedException si no se envia token', async () => {
      await expect(
        service.handleAuthenticate({ token: '', documentName: 'proj-1' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el token es invalido', async () => {
      jwtMock.verify.mockImplementation(() => {
        throw new Error('Invalid');
      });

      await expect(
        service.handleAuthenticate({ token: 'bad-token', documentName: 'proj-1' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el proyecto no existe', async () => {
      jwtMock.verify.mockReturnValue({ sub: 'user-1' });
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.handleAuthenticate({ token: 'good-token', documentName: 'proj-1' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario no es miembro ni dueno', async () => {
      jwtMock.verify.mockReturnValue({ sub: 'user-1' });
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        ownerId: 'other-user',
        members: [],
      });

      await expect(
        service.handleAuthenticate({ token: 'good-token', documentName: 'proj-1' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('autentica satisfactoriamente al propietario del proyecto', async () => {
      jwtMock.verify.mockReturnValue({ sub: 'user-1', email: 'owner@test.com' });
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        ownerId: 'user-1',
        members: [],
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'owner@test.com',
        name: 'Propietario Test',
      });

      const result = await service.handleAuthenticate({
        token: 'good-token',
        documentName: 'proj-1',
      } as never);

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'owner@test.com',
        name: 'Propietario Test',
        role: 'OWNER',
      });
    });
  });

  describe('handleLoadDocument and handleStoreDocument', () => {
    it('carga estado binario Yjs desde la base de datos', async () => {
      const doc = new Y.Doc();
      const map = doc.getMap('meta');
      map.set('name', 'Test Project');
      const state = Y.encodeStateAsUpdate(doc);

      prismaMock.yDocState.findUnique.mockResolvedValue({
        projectId: 'proj-1',
        state: Buffer.from(state),
      });

      const targetDoc = new Y.Doc();
      await service.handleLoadDocument({
        documentName: 'proj-1',
        document: targetDoc,
      } as never);

      expect(targetDoc.getMap('meta').get('name')).toBe('Test Project');
    });

    it('persiste estado binario en base de datos', async () => {
      const doc = new Y.Doc();
      doc.getMap('meta').set('updated', true);

      const upsertSpy = prismaMock.yDocState.upsert.mockResolvedValue({});

      await service.handleStoreDocument({
        documentName: 'proj-1',
        document: doc,
      } as never);

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'proj-1' },
        }),
      );
    });
  });
});
