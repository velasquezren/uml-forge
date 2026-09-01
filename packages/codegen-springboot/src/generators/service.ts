import type { AnalyzedEntity, CodegenOptions, GeneratedFile } from '../types.js';

/** Genera la interfaz de servicio y su implementacion para una entidad. */
export function generateJavaService(
  entity: AnalyzedEntity,
  options: CodegenOptions,
): GeneratedFile[] {
  if (entity.isAbstract || entity.isInterface) {
    return [];
  }

  const packagePath = options.packageName.replace(/\./g, '/');
  const entityName = entity.javaClassName;
  const serviceInterfaceName = `${entityName}Service`;
  const serviceImplName = `${entityName}ServiceImpl`;
  const repoName = `${entityName}Repository`;

  const interfaceContent = `package ${options.packageName}.service;

import ${options.packageName}.model.${entityName};
import java.util.List;
import java.util.Optional;

public interface ${serviceInterfaceName} {

    List<${entityName}> findAll();

    Optional<${entityName}> findById(Long id);

    ${entityName} save(${entityName} entity);

    void deleteById(Long id);
}
`;

  const implContent = `package ${options.packageName}.service.impl;

import ${options.packageName}.model.${entityName};
import ${options.packageName}.repository.${repoName};
import ${options.packageName}.service.${serviceInterfaceName};
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ${serviceImplName} implements ${serviceInterfaceName} {

    private final ${repoName} repository;

    public ${serviceImplName}(${repoName} repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<${entityName}> findAll() {
        return repository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<${entityName}> findById(Long id) {
        return repository.findById(id);
    }

    @Override
    public ${entityName} save(${entityName} entity) {
        return repository.save(entity);
    }

    @Override
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
`;

  return [
    {
      path: `src/main/java/${packagePath}/service/${serviceInterfaceName}.java`,
      content: interfaceContent,
    },
    {
      path: `src/main/java/${packagePath}/service/impl/${serviceImplName}.java`,
      content: implContent,
    },
  ];
}
