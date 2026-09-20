import { execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { generateSpringBootProject, writeProjectToDisk } from '../src/generator.js';
import type { UMLModel } from '../src/types.js';
import {
  compositionCascadeModel,
  enumsModel,
  interfaceRealizationModel,
  manyToManyModel,
  selfReferenceModel,
  singleInheritanceModel,
} from './models/index.js';

const tempDirsToClean: string[] = [];

async function compileWithMaven(model: UMLModel, modelTag: string): Promise<void> {
  const result = generateSpringBootProject(model, {
    groupId: 'com.umlforge.tests',
    artifactId: modelTag,
    packageName: `com.umlforge.tests.${modelTag.replace(/-/g, '_')}`,
  });

  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Fallo la generacion de codigo: ${result.error.message}`);
  }

  const tmpBase = await mkdtemp(path.join(os.tmpdir(), `umlforge-mvn-${modelTag}-`));
  tempDirsToClean.push(tmpBase);

  await writeProjectToDisk(result.value, tmpBase);

  // Ejecuta mvn -q compile de acuerdo a ADR 0005
  execSync('mvn -q compile', {
    cwd: tmpBase,
    stdio: 'pipe',
    timeout: 180000,
  });
}

describe('Compilacion real con Maven de los seis modelos de prueba (ADR 0005)', () => {
  afterAll(async () => {
    for (const dir of tempDirsToClean) {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {
        // Ignorado en limpieza
      }
    }
  });

  it('compila exitosamente Modelo 1: Herencia simple (clase abstracta)', async () => {
    await compileWithMaven(singleInheritanceModel, 'single-inheritance');
  }, 120000);

  it('compila exitosamente Modelo 2: Realizacion de interfaces multiples', async () => {
    await compileWithMaven(interfaceRealizationModel, 'interface-realization');
  }, 120000);

  it('compila exitosamente Modelo 3: Relacion muchos a muchos (@ManyToMany y @JoinTable)', async () => {
    await compileWithMaven(manyToManyModel, 'many-to-many');
  }, 120000);

  it('compila exitosamente Modelo 4: Autorreferencia recursiva (Category parent/children)', async () => {
    await compileWithMaven(selfReferenceModel, 'self-reference');
  }, 120000);

  it('compila exitosamente Modelo 5: Composicion con borrado en cascada (Order/OrderItem)', async () => {
    await compileWithMaven(compositionCascadeModel, 'composition-cascade');
  }, 120000);

  it('compila exitosamente Modelo 6: Enumeraciones (@Enumerated EnumType.STRING)', async () => {
    await compileWithMaven(enumsModel, 'enums');
  }, 120000);
});
