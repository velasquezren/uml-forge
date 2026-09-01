import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class OperationItemDto {
  @IsInt()
  seq!: number;

  @IsNotEmpty()
  op!: Record<string, unknown>;
}

export class SyncOperationsDto {
  @IsUUID()
  clientId!: string;

  @IsUUID()
  batchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationItemDto)
  operations!: OperationItemDto[];
}

export type OperationStatus = 'applied' | 'skipped_duplicate' | 'conflict';

export class OperationResultDto {
  @IsInt()
  seq!: number;

  @IsEnum(['applied', 'skipped_duplicate', 'conflict'])
  status!: OperationStatus;

  @IsString()
  opType!: string;

  @IsOptional()
  @IsString()
  existingId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncResponseDto {
  @IsUUID()
  batchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationResultDto)
  results!: OperationResultDto[];
}
