import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health E2E (/health)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health', 'docs'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health retorna 200 y estado de la base de datos up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      info: {
        database: {
          status: 'up',
        },
      },
    });
  });
});
