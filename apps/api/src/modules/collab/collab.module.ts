import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApiConfigModule } from '../../config/config.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CollabService } from './collab.service';

@Module({
  imports: [PrismaModule, JwtModule, ApiConfigModule],
  providers: [CollabService],
  exports: [CollabService],
})
export class CollabModule {}
