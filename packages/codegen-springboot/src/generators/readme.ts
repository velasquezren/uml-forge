import type { AnalyzedModel, CodegenOptions, GeneratedFile } from '../types.js';
import { entityBasePath } from './controller.js';

/** Instrucciones de base de datos segun la opcion elegida al generar. */
function databaseSection(options: CodegenOptions): string {
  if (options.database === 'h2') {
    return `La aplicacion usa **H2 en memoria**: no hace falta instalar ninguna base de
datos. Las tablas se crean al arrancar y se borran al parar.

- Consola de H2: <http://localhost:${options.serverPort}/h2-console>
- URL JDBC: \`jdbc:h2:mem:${options.artifactId}\`, usuario \`sa\`, sin contrasena.

Para usar PostgreSQL, crea la base de datos \`${options.artifactId}\` y arranca con el
perfil \`postgres\` (ver mas abajo).`;
  }

  return `La aplicacion usa **PostgreSQL**. Antes de arrancar:

1. Instala PostgreSQL (o arrancalo con Docker:
   \`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=${options.artifactId} postgres:16\`).
2. Crea la base de datos \`${options.artifactId}\` si no existe.
3. Si tu usuario o contrasena no son \`postgres\`/\`postgres\`, indicalos con las
   variables de entorno \`DB_URL\`, \`DB_USERNAME\` y \`DB_PASSWORD\`.

Las tablas se crean y actualizan solas al arrancar.

**Sin PostgreSQL** puedes arrancar igualmente con H2 en memoria usando el perfil \`h2\`.`;
}

/** Ordenes de arranque para Windows y para Linux o macOS. */
function runSection(options: CodegenOptions): string {
  const profile = options.database === 'postgresql' ? 'h2' : 'postgres';
  return `El proyecto incluye **Maven Wrapper**: no hace falta instalar Maven, se descarga
solo la primera vez.

Windows (PowerShell o CMD):

\`\`\`
mvnw.cmd spring-boot:run
\`\`\`

Linux o macOS:

\`\`\`
./mvnw spring-boot:run
\`\`\`

Con el perfil \`${profile}\`:

\`\`\`
mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=${profile}"
./mvnw spring-boot:run -Dspring-boot.run.profiles=${profile}
\`\`\`

En PowerShell las comillas alrededor de \`-D...\` son obligatorias.`;
}

/** Problemas habituales y su solucion. */
const TROUBLESHOOTING = `- **"JAVA_HOME is not set" o "java no se reconoce"**: instala un JDK 17 o
  superior (por ejemplo Eclipse Temurin) y abre una terminal nueva.
- **"release version 17 not supported"**: el JDK es anterior a 17; actualizalo.
- **"Connection to localhost:5432 refused"**: PostgreSQL no esta arrancado.
  Arrancalo o usa el perfil \`h2\`.
- **"Port 8080 was already in use"**: otro programa usa el puerto. Arranca con
  otro: \`mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"\`.
- **mvnw.cmd no hace nada o falla al descargar Maven**: revisa el proxy o el
  antivirus; la descarga va a \`repo.maven.apache.org\`.`;

/** Genera un README.md con la guia de instalacion, ejecucion y endpoints del backend. */
export function generateReadme(options: CodegenOptions, analyzed: AnalyzedModel): GeneratedFile {
  const entitySections = Array.from(analyzed.entities.values())
    .filter((e) => !e.isAbstract && !e.isInterface)
    .map((e) => {
      return `- **${e.javaClassName}**: \`${entityBasePath(e)}\` (GET, POST, PUT, DELETE)`;
    })
    .join('\n');

  const content = `# ${options.applicationName}

Backend Spring Boot 3 generado por **UML Forge** a partir del diagrama de clases.

## Requisitos

- **JDK 17 o superior** (\`java -version\`). Maven no es necesario.

## Arranque

${runSection(options)}

La API queda en <http://localhost:${options.serverPort}> y la documentacion
interactiva (Swagger UI) en <http://localhost:${options.serverPort}/swagger-ui.html>.

## Base de datos

${databaseSection(options)}

## Endpoints REST

${entitySections || '- No se definieron entidades concretas en el modelo.'}

## Probar con Postman

La carpeta \`postman/\` trae una coleccion con todas las peticiones del CRUD y un
entorno con la URL local. Importa los dos ficheros en Postman y sigue
\`postman/README.md\`.

## Estructura

\`\`\`
${options.artifactId}/
  mvnw, mvnw.cmd, .mvn/      Maven Wrapper
  pom.xml
  src/main/java/${options.packageName.replace(/\./g, '/')}/
    ${options.applicationName}Application.java
    model/        Entidades JPA
    repository/   Repositorios Spring Data JPA
    service/      Logica de negocio
    controller/   Controladores REST
    dto/          Objetos de peticion y respuesta
  postman/        Coleccion, entorno y guia de Postman
  src/main/resources/
    application.properties
\`\`\`

## Problemas frecuentes

${TROUBLESHOOTING}
`;

  return { path: 'README.md', content };
}
