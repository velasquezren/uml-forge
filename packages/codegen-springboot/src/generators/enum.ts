import type { CodegenOptions, GeneratedFile, UMLEnum } from '../types.js';
import { toPascalCase, toScreamingSnakeCase } from '../naming.js';

/** Genera el fichero Java para una enumeracion UML. */
export function generateJavaEnum(umlEnum: UMLEnum, options: CodegenOptions): GeneratedFile {
  const enumName = toPascalCase(umlEnum.name);
  const packagePath = options.packageName.replace(/\./g, '/');

  const literals =
    umlEnum.literals.length > 0
      ? umlEnum.literals.map((lit) => `    ${toScreamingSnakeCase(lit)}`).join(',\n') + ';'
      : '    DEFAULT_VALUE;';

  const content = `package ${options.packageName}.model;

public enum ${enumName} {
${literals}
}
`;

  return {
    path: `src/main/java/${packagePath}/model/${enumName}.java`,
    content,
  };
}
