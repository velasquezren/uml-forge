import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../../config/config.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  imports: [ApiConfigModule],
  controllers: [AiController],
  providers: [AiService, GeminiProvider, OllamaProvider],
  exports: [AiService, GeminiProvider, OllamaProvider],
})
export class AiModule {}
