import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CodegenController } from './codegen.controller';
import { CodegenService } from './codegen.service';

@Module({
  imports: [PrismaModule],
  controllers: [CodegenController],
  providers: [CodegenService],
  exports: [CodegenService],
})
export class CodegenModule {}
