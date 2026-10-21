import type { CodegenOptions, GeneratedFile } from '../types.js';

/**
 * Conexion a PostgreSQL. Cada valor se puede sustituir con una variable de
 * entorno (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`) sin tocar el fichero: es lo
 * que permite arrancar en un equipo con otra contrasenna o en la nube.
 */
function postgresBlock(options: CodegenOptions): string {
  return `# PostgreSQL. Sobrescribible con DB_URL, DB_USERNAME y DB_PASSWORD.
# La base de datos ${options.artifactId} debe existir antes de arrancar.
spring.datasource.url=\${DB_URL:jdbc:postgresql://localhost:5432/${options.artifactId}}
spring.datasource.username=\${DB_USERNAME:postgres}
spring.datasource.password=\${DB_PASSWORD:postgres}
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.hibernate.ddl-auto=update`;
}

/** H2 en memoria: no necesita instalar nada y las tablas se crean al arrancar. */
function h2Block(options: CodegenOptions): string {
  return `# H2 en memoria: no requiere instalar ninguna base de datos.
spring.datasource.url=jdbc:h2:mem:${options.artifactId};DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.jpa.hibernate.ddl-auto=create-drop`;
}

/**
 * Genera `application.properties` con la base de datos elegida y un perfil con
 * la otra (ADR 0038): un proyecto pensado para PostgreSQL arranca igualmente
 * sin base de datos con `-Dspring-boot.run.profiles=h2`, y uno pensado para H2
 * se conecta a PostgreSQL con el perfil `postgres`.
 */
export function generateApplicationProperties(options: CodegenOptions): GeneratedFile[] {
  const isPostgres = options.database === 'postgresql';

  const main = `# Configuracion de Spring Boot generada por UML Forge
spring.application.name=${options.applicationName}
# PORT lo fijan plataformas como Cloud Run; en local se usa ${options.serverPort}.
server.port=\${PORT:${options.serverPort}}

${isPostgres ? postgresBlock(options) : h2Block(options)}

# JPA / Hibernate
# Las relaciones se cargan bajo demanda y los controladores devuelven las
# entidades: la sesion debe seguir abierta mientras se escribe el JSON.
spring.jpa.open-in-view=true
spring.jpa.show-sql=false

# Documentacion de la API (Swagger UI)
springdoc.swagger-ui.path=/swagger-ui.html
`;

  return [
    { path: 'src/main/resources/application.properties', content: main },
    isPostgres
      ? {
          path: 'src/main/resources/application-h2.properties',
          content: `# Perfil h2: arranca sin PostgreSQL.\n${h2Block(options)}\n`,
        }
      : {
          path: 'src/main/resources/application-postgres.properties',
          content: `# Perfil postgres: usa PostgreSQL en lugar de H2.\n${postgresBlock(options)}\n`,
        },
  ];
}
