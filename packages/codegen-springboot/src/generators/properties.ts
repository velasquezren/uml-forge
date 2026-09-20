import type { CodegenOptions, GeneratedFile } from '../types.js';

/** Genera los archivos de configuracion application.properties y application.yml. */
export function generateApplicationProperties(options: CodegenOptions): GeneratedFile[] {
  const isPostgres = options.database === 'postgresql';

  const propertiesContent = `# Configuracion de Spring Boot generada por UML Forge
spring.application.name=${options.applicationName}
server.port=${options.serverPort}

${
  isPostgres
    ? `# PostgreSQL DataSource
spring.datasource.url=jdbc:postgresql://localhost:5432/${options.artifactId}
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect`
    : `# H2 In-Memory DataSource
spring.datasource.url=jdbc:h2:mem:${options.artifactId};DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true`
}
`;

  return [
    {
      path: 'src/main/resources/application.properties',
      content: propertiesContent,
    },
  ];
}
