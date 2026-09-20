import type { AnalyzedModel, CodegenOptions, GeneratedFile, UMLClass } from '../types.js';
import { sanitizeJavaIdentifier, toCamelCase, toPascalCase } from '../naming.js';
import { mapUmlTypeToJava } from './type-helper.js';

/** Genera el fichero Java para una interfaz UML. */
export function generateJavaInterface(
  umlInterface: UMLClass,
  model: AnalyzedModel,
  options: CodegenOptions,
): GeneratedFile {
  const interfaceName = toPascalCase(umlInterface.name);
  const packagePath = options.packageName.replace(/\./g, '/');
  const importSet = new Set<string>();

  const operationsCode = umlInterface.operations.map((op) => {
    const returnTypeInfo = mapUmlTypeToJava(op.returnType, model);
    returnTypeInfo.imports.forEach((imp) => importSet.add(imp));

    const params = op.parameters.map((p) => {
      const paramTypeInfo = mapUmlTypeToJava(p.type, model);
      paramTypeInfo.imports.forEach((imp) => importSet.add(imp));
      return `${paramTypeInfo.javaType} ${sanitizeJavaIdentifier(p.name)}`;
    });

    return `    ${returnTypeInfo.javaType} ${toCamelCase(op.name)}(${params.join(', ')});`;
  });

  const importsBlock =
    importSet.size > 0
      ? Array.from(importSet)
          .sort()
          .map((imp) => `import ${imp};`)
          .join('\n') + '\n\n'
      : '';

  const body =
    operationsCode.length > 0
      ? operationsCode.join('\n\n')
      : '    // Interfaz marcadora sin operaciones';

  const content = `package ${options.packageName}.model;

${importsBlock}public interface ${interfaceName} {

${body}
}
`;

  return {
    path: `src/main/java/${packagePath}/model/${interfaceName}.java`,
    content,
  };
}
