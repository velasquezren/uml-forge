import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  info: {
    database: {
      status: 'up' | 'down';
    };
  };
  timestamp: string;
}

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Verificacion de estado del servicio y base de datos' })
  @ApiResponse({ status: 200, description: 'Servicio en estado optimo' })
  @ApiResponse({ status: 503, description: 'Servicio degradado o sin conexion a base de datos' })
  async check(): Promise<HealthCheckResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        info: {
          database: {
            status: 'down',
          },
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
