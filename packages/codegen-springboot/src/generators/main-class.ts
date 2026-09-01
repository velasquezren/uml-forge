import type { CodegenOptions, GeneratedFile } from '../types.js';
import { toPascalCase } from '../naming.js';

/** Genera la clase principal @SpringBootApplication. */
export function generateMainApplicationClass(options: CodegenOptions): GeneratedFile {
  const className = `${toPascalCase(options.applicationName)}Application`;
  const packagePath = options.packageName.replace(/\./g, '/');

  const content = `package ${options.packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }
}
`;

  return {
    path: `src/main/java/${packagePath}/${className}.java`,
    content,
  };
}
