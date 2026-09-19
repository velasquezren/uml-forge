import type { AnalyzedModel, CodegenOptions, GeneratedFile } from '../types.js';
import { pluralize, toKebabCase } from '../naming.js';

/** Genera un archivo README.md con la guia de instalacion, ejecucion y endpoints del backend. */
export function generateReadme(options: CodegenOptions, analyzed: AnalyzedModel): GeneratedFile {
  const isPostgres = options.database === 'postgresql';

  const entitySections = Array.from(analyzed.entities.values())
    .filter((e) => !e.isAbstract && !e.isInterface)
    .map((e) => {
      const path = toKebabCase(pluralize(e.javaClassName));
      return `- **${e.javaClassName}**: \`/api/${path}\` (CRUD completo: GET, POST, PUT, DELETE)`;
    })
    .join('\n');

  const content = `# ${options.applicationName}

Backend Spring Boot 3 con Java 21 generado automáticamente por **UML Forge** a partir del diagrama de clases UML.

---

## 📋 Requisitos Previos

- **Java**: Versión 21 LTS o superior (\`java -version\`)
- **Maven**: Versión 3.9 o superior (\`mvn -version\`)

---

## 🚀 Guía de Ejecución Rápida

Para compilar y arrancar la aplicación, ejecuta el siguiente comando en la raíz del proyecto:

\`\`\`bash
mvn spring-boot:run
\`\`\`

Spring Boot compilará las fuentes Java, levantará el servidor embebido Tomcat en el puerto **${options.serverPort}** y creará automáticamente todas las tablas en la base de datos a partir de las entidades JPA.

---

## 🗄️ Base de Datos y Creación Automática de Tablas

${
  isPostgres
    ? `### PostgreSQL
- **URL**: \`jdbc:postgresql://localhost:5432/${options.artifactId}\`
- **Usuario**: \`postgres\`
- **Contraseña**: \`postgres\`
- **Estrategia DDL**: \`spring.jpa.hibernate.ddl-auto=update\`
  *(Hibernate creará y actualizará automáticamente las tablas en la base de datos al arrancar).*`
    : `### H2 Database (En memoria)
- **Modo**: 100% en memoria, no requiere instalar ningún motor de base de datos en tu equipo.
- **URL JDBC**: \`jdbc:h2:mem:${options.artifactId};DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE\`
- **Usuario**: \`sa\`
- **Contraseña**: *(dejar en blanco)*
- **Consola Web H2**: [http://localhost:${options.serverPort}/h2-console](http://localhost:${options.serverPort}/h2-console)
- **Estrategia DDL**: \`spring.jpa.hibernate.ddl-auto=create-drop\`
  *(Las tablas, relaciones y restricciones se crean automáticamente al iniciar la aplicación).*`
}

---

## 📡 Endpoints REST Generados

La aplicación expone una API REST organizada en controladores, servicios y DTOs:

${entitySections || '- No se definieron entidades concretas en el modelo.'}

---

## 🏗️ Arquitectura del Proyecto Generado

\`\`\`
${options.artifactId}/
├── pom.xml
├── README.md
└── src/
    └── main/
        ├── java/${options.packageName.replace(/\./g, '/')}/
        │   ├── ${options.applicationName}Application.java
        │   ├── model/         # Entidades JPA (@Entity, @Table, @Id)
        │   ├── repository/    # Repositorios Spring Data JPA (JpaRepository)
        │   ├── service/       # Servicios de logica de negocio (@Service)
        │   ├── controller/    # Controladores REST (@RestController)
        │   └── dto/           # Data Transfer Objects (Request / Response)
        └── resources/
            └── application.properties
\`\`\`
`;

  return {
    path: 'README.md',
    content,
  };
}
