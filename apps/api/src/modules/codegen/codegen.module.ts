import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CollabModule } from '../collab/collab.module';
import { CodegenController } from './codegen.controller';
import { CodegenService } from './codegen.service';

@Module({
  imports: [PrismaModule, CollabModule],
  controllers: [CodegenController],
  providers: [CodegenService],
  exports: [CodegenService],
})
export class CodegenModule {}
