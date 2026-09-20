import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  it('valida correctamente las variables de entorno validas', () => {
    const validEnv = {
      PORT: '3000',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://umlforge:umlforge@localhost:5432/umlforge',
      JWT_ACCESS_SECRET: 'super_secret_access_key_min_16_chars',
      JWT_REFRESH_SECRET: 'super_secret_refresh_key_min_16_chars',
      COOKIE_SECRET: 'super_secret_cookie_key_min_16_chars',
    };

    const config = validateEnv(validEnv);
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('test');
    expect(config.JWT_ACCESS_EXPIRES_IN).toBe('15m');
  });

  it('lanza error si falta DATABASE_URL', () => {
    const invalidEnv = {
      JWT_ACCESS_SECRET: 'super_secret_access_key_min_16_chars',
      JWT_REFRESH_SECRET: 'super_secret_refresh_key_min_16_chars',
      COOKIE_SECRET: 'super_secret_cookie_key_min_16_chars',
    };

    expect(() => validateEnv(invalidEnv)).toThrowError(/DATABASE_URL/);
  });

  it('lanza error si JWT_ACCESS_SECRET es demasiado corto', () => {
    const invalidEnv = {
      DATABASE_URL: 'postgresql://localhost:5432',
      JWT_ACCESS_SECRET: 'corto',
      JWT_REFRESH_SECRET: 'super_secret_refresh_key_min_16_chars',
      COOKIE_SECRET: 'super_secret_cookie_key_min_16_chars',
    };

    expect(() => validateEnv(invalidEnv)).toThrowError(/JWT_ACCESS_SECRET/);
  });
});
