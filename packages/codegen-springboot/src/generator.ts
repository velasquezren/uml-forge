import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ok, err, type Result, validateModel } from '@uml-forge/uml-core';
import { analyzeModel } from './analyzer.js';
import { invalidModelError, type CodegenError } from './errors.js';
import { generateJavaController } from './generators/controller.js';
import { generateJavaDtos } from './generators/dto.js';
import { generateJavaEntity } from './generators/entity.js';
import { generateJavaEnum } from './generators/enum.js';
import { generateJavaInterface } from './generators/interface.js';
import { generateMainApplicationClass } from './generators/main-class.js';
import { generatePomXml } from './generators/pom.js';
import { generateApplicationProperties } from './generators/properties.js';
import { generateJavaRepository } from './generators/repository.js';
import { generateJavaService } from './generators/service.js';
import { sanitizePackageName, toKebabCase, toPascalCase } from './naming.js';
import type { CodegenOptions, GeneratedFile, UMLModel } from './types.js';

/** Resuelve las opciones por defecto a partir del modelo. */
export function resolveDefaultOptions(
  model: UMLModel,
  overrides?: Partial<CodegenOptions>,
): CodegenOptions {
  const artifactId = overrides?.artifactId || toKebabCase(model.name) || 'demo';
  const groupId = overrides?.groupId || 'com.example';
  const rawPackage = overrides?.packageName || `${groupId}.${artifactId.replace(/-/g, '_')}`;
  const packageName = sanitizePackageName(rawPackage);
  const applicationName = overrides?.applicationName || toPascalCase(model.name) || 'Demo';

  return {
    groupId,
    artifactId,
    packageName,
    javaVersion: '21',
    springBootVersion: overrides?.springBootVersion || '3.3.5',
    database: overrides?.database || 'postgresql',
    serverPort: overrides?.serverPort || 8080,
    description: overrides?.description || `Aplicacion Spring Boot para ${model.name}`,
    applicationName,
  };
}

/** Genera todos los ficheros del proyecto Spring Boot a partir del modelo UML. */
export function generateSpringBootProject(
  model: UMLModel,
  options?: Partial<CodegenOptions>,
): Result<GeneratedFile[], CodegenError> {
  const validationErrors = validateModel(model);
  if (validationErrors.length > 0) {
    return err(invalidModelError(validationErrors));
  }

  const resolvedOptions = resolveDefaultOptions(model, options);
  const analyzed = analyzeModel(model, resolvedOptions);
  const files: GeneratedFile[] = [];

  // 1. pom.xml y configuraciones
  files.push(generatePomXml(resolvedOptions));
  files.push(...generateApplicationProperties(resolvedOptions));
  files.push(generateMainApplicationClass(resolvedOptions));

  // 2. Enumeraciones
  for (const umlEnum of analyzed.enums.values()) {
    files.push(generateJavaEnum(umlEnum, resolvedOptions));
  }

  // 3. Interfaces
  for (const umlIface of analyzed.interfaces.values()) {
    files.push(generateJavaInterface(umlIface, analyzed, resolvedOptions));
  }

  // 4. Entidades, Repositorios, Servicios, Controladores y DTOs
  for (const entity of analyzed.entities.values()) {
    files.push(generateJavaEntity(entity, analyzed, resolvedOptions));

    const repo = generateJavaRepository(entity, resolvedOptions);
    if (repo) files.push(repo);

    files.push(...generateJavaService(entity, resolvedOptions));

    const controller = generateJavaController(entity, resolvedOptions);
    if (controller) files.push(controller);

    files.push(...generateJavaDtos(entity, analyzed, resolvedOptions));
  }

  return ok(files);
}

/** Escribe los ficheros generados en el disco. */
export async function writeProjectToDisk(
  files: readonly GeneratedFile[],
  targetDir: string,
): Promise<void> {
  for (const file of files) {
    const fullPath = path.join(targetDir, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf8');
  }
}
