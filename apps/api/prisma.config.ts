import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

const rootEnv = path.resolve(__dirname, '../../.env');
if (existsSync(rootEnv)) {
  loadEnvFile(rootEnv);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://umlforge:umlforge@localhost:5432/umlforge?schema=public',
  },
});
