import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GenerationJobStatus } from '@prisma/client';
import {
  generateSpringBootProject,
  resolveDefaultOptions,
  type CodegenOptions,
} from '@uml-forge/codegen-springboot';
import { fromYDoc, type UMLModel } from '@uml-forge/uml-core';
import * as Y from 'yjs';
import { PrismaService } from '../../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

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

  /** Reconstruye el modelo UML desde el estado binario del documento Yjs. */
  private async loadModel(projectId: string): Promise<UMLModel> {
    const record = await this.prisma.yDocState.findUnique({ where: { projectId } });

    if (!record?.state || record.state.length === 0) {
      throw new BadRequestException(
        'El proyecto todavia no tiene modelo guardado: abre el editor y anade al menos una clase',
      );
    }

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(record.state));

    const result = fromYDoc(ydoc);
    if (!result.ok) {
      throw new BadRequestException(`El modelo guardado no es legible: ${result.error.message}`);
    }

    if (result.value.classes.length === 0) {
      throw new BadRequestException('El modelo no contiene ninguna clase, no hay nada que generar');
    }

    return result.value;
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
