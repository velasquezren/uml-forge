import type { AnalyzedEntity, CodegenOptions, GeneratedFile } from '../types.js';
import { toKebabCase } from '../naming.js';

/** Genera el controlador REST para una entidad. */
export function generateJavaController(
  entity: AnalyzedEntity,
  options: CodegenOptions,
): GeneratedFile | null {
  if (entity.isAbstract || entity.isInterface) {
    return null;
  }

  const packagePath = options.packageName.replace(/\./g, '/');
  const entityName = entity.javaClassName;
  const controllerName = `${entityName}Controller`;
  const serviceName = `${entityName}Service`;
  const routePath = `/api/${toKebabCase(entity.tableName)}`;

  const content = `package ${options.packageName}.controller;

import ${options.packageName}.model.${entityName};
import ${options.packageName}.service.${serviceName};
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("${routePath}")
public class ${controllerName} {

    private final ${serviceName} service;

    public ${controllerName}(${serviceName} service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<${entityName}>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<${entityName}> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<${entityName}> create(@RequestBody ${entityName} entity) {
        ${entityName} created = service.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<${entityName}> update(@PathVariable Long id, @RequestBody ${entityName} entity) {
        return service.findById(id)
                .map(existing -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
`;

  return {
    path: `src/main/java/${packagePath}/controller/${controllerName}.java`,
    content,
  };
}
