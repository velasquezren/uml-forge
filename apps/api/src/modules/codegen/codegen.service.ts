import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GenerationJobStatus } from '@prisma/client';
import {
  generateSpringBootProject,
  resolveDefaultOptions,
  type CodegenOptions,
} from '@uml-forge/codegen-springboot';
import type { UMLModel } from '@uml-forge/uml-core';
import { PrismaService } from '../../prisma/prisma.service';
import { CollabService } from '../collab/collab.service';
import { createZipArchive } from './codegen.zip';
import type { GenerateBackendDto } from './dto/generate-backend.dto';

/** Resultado de una generacion lista para descargar. */
export interface GeneratedArchive {
  readonly buffer: Buffer;
  readonly fileName: string;
  readonly fileCount: number;
  readonly options: CodegenOptions;
}

/**
 * Genera el backend Spring Boot de un proyecto a partir del modelo vivo del
 * documento Yjs. La generacion es sincrona porque tarda milisegundos: el
 * registro en `GenerationJob` es la bitacora de lo ocurrido, no una cola.
 */
@Injectable()
export class CodegenService {
  private readonly logger = new Logger(CodegenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collab: CollabService,
  ) {}

  async generateSpringBoot(
    projectId: string,
    userId: string,
    dto: GenerateBackendDto,
  ): Promise<GeneratedArchive> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('El proyecto no existe');
    }

    const job = await this.prisma.generationJob.create({
      data: {
        projectId,
        userId,
        status: GenerationJobStatus.PROCESSING,
        targetFramework: 'SPRING_BOOT_3',
      },
    });

    try {
      const model = await this.loadModel(projectId);
      const archive = await this.buildArchive(model, dto);

      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: { status: GenerationJobStatus.COMPLETED, resultUrl: archive.fileName },
      });

      this.logger.log(
        `Backend generado para el proyecto ${projectId}: ${archive.fileCount} ficheros`,
      );
      return archive;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: { status: GenerationJobStatus.FAILED, errorMessage: message.slice(0, 500) },
      });
      throw error;
    }
  }

  /**
   * Modelo del proyecto tal como esta ahora. Se lee del documento vivo de la
   * colaboracion y solo si nadie lo tiene abierto del estado guardado: la base
   * de datos va unos segundos por detras, y quien anadia una clase y generaba
   * enseguida recibia "el proyecto todavia no tiene modelo" (ADR 0042).
   */
  private async loadModel(projectId: string): Promise<UMLModel> {
    const model = await this.collab.currentModel(projectId);

    if (model === null) {
      throw new BadRequestException(
        'El proyecto todavia no tiene modelo guardado: abre el editor y anade al menos una clase',
      );
    }

    if (model.classes.length === 0) {
      throw new BadRequestException('El modelo no contiene ninguna clase, no hay nada que generar');
    }

    return model;
  }

  /** Ejecuta el generador y comprime su salida. */
  private async buildArchive(model: UMLModel, dto: GenerateBackendDto): Promise<GeneratedArchive> {
    const options = resolveDefaultOptions(model, dto);
    const generated = generateSpringBootProject(model, options);

    if (!generated.ok) {
      throw new BadRequestException({
        message: generated.error.message,
        code: generated.error.code,
        details: generated.error.details,
      });
    }

    const buffer = await createZipArchive(generated.value, options.artifactId);

    return {
      buffer,
      fileName: `${options.artifactId}.zip`,
      fileCount: generated.value.length,
      options,
    };
  }
}
