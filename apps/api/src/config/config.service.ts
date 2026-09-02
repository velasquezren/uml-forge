import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { Injectable } from '@nestjs/common';
import { EnvConfig, validateEnv } from './env.schema';

@Injectable()
export class ApiConfigService {
  private readonly config: EnvConfig;

  constructor() {
    const candidatePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../../.env'),
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../../../../.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../.env'),
    ];

    for (const envPath of candidatePaths) {
      if (existsSync(envPath)) {
        try {
          loadEnvFile(envPath);
          break;
        } catch {
          // Ignorado si ya esta cargado o no se puede leer
        }
      }
    }

    this.config = validateEnv(process.env);
  }

  get port(): number {
    return this.config.PORT;
  }

  get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get jwtAccessSecret(): string {
    return this.config.JWT_ACCESS_SECRET;
  }

  get jwtAccessExpiresIn(): string {
    return this.config.JWT_ACCESS_EXPIRES_IN;
  }

  get jwtRefreshSecret(): string {
    return this.config.JWT_REFRESH_SECRET;
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.JWT_REFRESH_EXPIRES_IN;
  }

  get cookieSecret(): string {
    return this.config.COOKIE_SECRET;
  }

  get corsOrigin(): string {
    return this.config.CORS_ORIGIN;
  }

  get throttleTtl(): number {
    return this.config.THROTTLE_TTL;
  }

  get throttleLimit(): number {
    return this.config.THROTTLE_LIMIT;
  }

  get aiProvider(): 'gemini' | 'ollama' {
    return this.config.AI_PROVIDER;
  }

  get geminiApiKey(): string {
    return this.config.GEMINI_API_KEY;
  }

  get geminiModel(): string {
    return this.config.GEMINI_MODEL;
  }

  get ollamaBaseUrl(): string {
    return this.config.OLLAMA_BASE_URL;
  }

  get ollamaModel(): string {
    return this.config.OLLAMA_MODEL;
  }

  /** Modelo multimodal, necesario para leer la foto de un diagrama. */
  get ollamaVisionModel(): string {
    return this.config.OLLAMA_VISION_MODEL;
  }
}
