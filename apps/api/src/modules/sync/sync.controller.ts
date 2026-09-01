import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireProjectRoles } from '../../common/decorators/project-role.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard';
import { SyncOperationsDto, SyncResponseDto } from './dto/sync-operations.dto';
import { SyncService } from './sync.service';

@ApiTags('sync')
@ApiBearerAuth('JWT')
@Controller('projects/:id/operations')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequireProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  @ApiOperation({
    summary: 'Sincronizar lote de operaciones offline con resolucion de conflictos e idempotencia',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lote procesado exitosamente con resultado individual por operacion',
    type: SyncResponseDto,
  })
  async syncOperations(
    @Param('id') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SyncOperationsDto,
  ): Promise<SyncResponseDto> {
    return this.syncService.applyBatch(projectId, userId, dto);
  }
}
