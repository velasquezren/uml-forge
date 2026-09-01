import type { AnalyzedEntity, CodegenOptions, GeneratedFile } from '../types.js';

/** Genera la interfaz de repositorio Spring Data JPA para una entidad. */
export function generateJavaRepository(
  entity: AnalyzedEntity,
  options: CodegenOptions,
): GeneratedFile | null {
  if (entity.isAbstract || entity.isInterface) {
    return null;
  }

  const packagePath = options.packageName.replace(/\./g, '/');
  const repositoryName = `${entity.javaClassName}Repository`;

  const content = `package ${options.packageName}.repository;

import ${options.packageName}.model.${entity.javaClassName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${repositoryName} extends JpaRepository<${entity.javaClassName}, Long> {
}
`;

  return {
    path: `src/main/java/${packagePath}/repository/${repositoryName}.java`,
    content,
  };
}
