import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireProjectRoles } from '../../common/decorators/project-role.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard';
import { CodegenService } from './codegen.service';
import { GenerateBackendDto } from './dto/generate-backend.dto';

@ApiTags('codegen')
@ApiBearerAuth('JWT')
@Controller('projects/:id/codegen')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class CodegenController {
  constructor(private readonly codegenService: CodegenService) {}

  @Post('springboot')
  @HttpCode(HttpStatus.OK)
  @RequireProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  @ApiOperation({
    summary: 'Generar el backend Spring Boot del proyecto y descargarlo comprimido',
  })
  @ApiProduces('application/zip')
  @ApiResponse({ status: HttpStatus.OK, description: 'Proyecto Spring Boot en formato ZIP' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'El modelo no es generable' })
  async generateSpringBoot(
    @Param('id') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateBackendDto,
    @Res() response: Response,
  ): Promise<void> {
    const archive = await this.codegenService.generateSpringBoot(projectId, userId, dto);

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${archive.fileName}"`);
    response.setHeader('Content-Length', archive.buffer.length);
    // El navegador solo puede leer el nombre del fichero si se expone la cabecera.
    response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Generated-Files');
    response.setHeader('X-Generated-Files', String(archive.fileCount));
    response.send(archive.buffer);
  }
}
