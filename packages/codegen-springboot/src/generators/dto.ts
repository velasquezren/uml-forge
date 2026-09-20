import type { AnalyzedEntity, AnalyzedModel, CodegenOptions, GeneratedFile } from '../types.js';
import { sanitizeJavaIdentifier } from '../naming.js';
import { mapUmlTypeToJava } from './type-helper.js';

/** Genera los DTO records para una entidad. */
export function generateJavaDtos(
  entity: AnalyzedEntity,
  model: AnalyzedModel,
  options: CodegenOptions,
): GeneratedFile[] {
  if (entity.isInterface) {
    return [];
  }

  const packagePath = options.packageName.replace(/\./g, '/');
  const entityName = entity.javaClassName;
  const requestDtoName = `${entityName}Request`;
  const responseDtoName = `${entityName}Response`;

  const importSet = new Set<string>();
  const requestFields: string[] = [];
  const responseFields: string[] = ['Long id'];

  for (const attr of entity.attributes) {
    const typeInfo = mapUmlTypeToJava(attr.type, model);
    typeInfo.imports.forEach((imp) => importSet.add(imp));
    const fieldDecl = `${typeInfo.javaType} ${sanitizeJavaIdentifier(attr.name)}`;
    requestFields.push(fieldDecl);
    responseFields.push(fieldDecl);
  }

  importSet.add(`${options.packageName}.model.*`);

  const importsBlock =
    Array.from(importSet)
      .sort()
      .map((imp) => `import ${imp};`)
      .join('\n') + '\n\n';

  const requestContent = `package ${options.packageName}.dto;

${importsBlock}public record ${requestDtoName}(
    ${requestFields.join(',\n    ')}
) {}
`;

  const responseContent = `package ${options.packageName}.dto;

${importsBlock}public record ${responseDtoName}(
    ${responseFields.join(',\n    ')}
) {}
`;

  return [
    {
      path: `src/main/java/${packagePath}/dto/${requestDtoName}.java`,
      content: requestContent,
    },
    {
      path: `src/main/java/${packagePath}/dto/${responseDtoName}.java`,
      content: responseContent,
    },
  ];
}
