import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiConfigService } from './config.service';

vi.mock('node:fs', () => ({ existsSync: () => false }));

describe('cookie de sesion', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['production', undefined, true],
    ['development', undefined, false],
    ['production', 'false', false],
    ['production', 'true', true],
  ])('NODE_ENV=%s COOKIE_SECURE=%s produce secure=%s', (environment, secure, expected) => {
    vi.stubEnv('NODE_ENV', environment);
    vi.stubEnv('COOKIE_SECURE', secure);
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('JWT_ACCESS_SECRET', 'access_secret_for_test');
    vi.stubEnv('JWT_REFRESH_SECRET', 'refresh_secret_for_test');
    vi.stubEnv('COOKIE_SECRET', 'cookie_secret_for_test');
    expect(new ApiConfigService().cookieSecure).toBe(expected);
  });
});
