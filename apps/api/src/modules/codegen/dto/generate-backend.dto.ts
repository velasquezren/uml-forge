import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** Identificadores Java validos: segmentos en minusculas separados por puntos. */
const JAVA_PACKAGE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

/** Identificador Maven: minusculas, digitos y guiones. */
const ARTIFACT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Opciones de generacion que el cliente puede sobrescribir. Todas son
 * opcionales: el generador deriva las que falten del nombre del modelo.
 */
export class GenerateBackendDto {
  @ApiPropertyOptional({
    description: 'Identificador de grupo Maven',
    example: 'com.umlforge',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(JAVA_PACKAGE_PATTERN, {
    message: 'groupId debe ser un identificador Java valido, por ejemplo com.umlforge',
  })
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Identificador de artefacto Maven, tambien nombre del ZIP',
    example: 'clinica-veterinaria',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(ARTIFACT_ID_PATTERN, {
    message:
      'artifactId debe empezar por letra minuscula y contener solo minusculas, digitos o guiones',
  })
  artifactId?: string;

  @ApiPropertyOptional({
    description: 'Paquete raiz de las clases Java generadas',
    example: 'com.umlforge.veterinaria',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(JAVA_PACKAGE_PATTERN, {
    message: 'packageName debe ser un identificador Java valido',
  })
  packageName?: string;

  @ApiPropertyOptional({
    description: 'Motor de base de datos del proyecto generado',
    enum: ['postgresql', 'h2'],
    default: 'postgresql',
  })
  @IsOptional()
  @IsIn(['postgresql', 'h2'])
  database?: 'postgresql' | 'h2';

  @ApiPropertyOptional({
    description: 'Puerto en el que arranca el backend generado',
    example: 8080,
  })
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  serverPort?: number;

  @ApiPropertyOptional({
    description: 'Descripcion que se escribe en el pom.xml',
    example: 'Backend de la clinica veterinaria',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
