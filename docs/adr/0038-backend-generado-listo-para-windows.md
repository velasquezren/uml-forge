# 0038. Backend generado listo para arrancar en Windows

Fecha: 2026-10-18
Estado: Aceptado. Amplia los ADR 0005 y 0022.

## Contexto

El proyecto Spring Boot que descarga la persona "a veces no corria", sobre todo
en Windows. Generando y arrancando de verdad los seis modelos de prueba se vio
por que:

1. La base de datos por defecto era PostgreSQL, con la URL, el usuario y la
   contrasenna fijos. Sin un PostgreSQL local con esa base de datos exacta la
   aplicacion se caia al arrancar con `Connection to localhost:5432 refused`.
2. No habia Maven Wrapper: hacia falta tener Maven instalado y en el `PATH`, lo
   que casi nunca ocurre en Windows.
3. Se exigia Java 21, cuando Spring Boot 3 funciona desde Java 17, que es lo que
   mas se encuentra instalado.
4. Faltaba Swagger, que la especificacion del generador exige.
5. Un nombre de modelo con `&` o `<` dejaba el `pom.xml` mal formado, y los
   nombres con tilde se partian (`Categoría` daba la clase `CategorA`).
6. El README del proyecto llevaba emojis, prohibidos por las reglas del
   repositorio.

## Decision

- El dialogo de generacion propone H2 en memoria por defecto, que arranca en
  cualquier equipo.
- Con PostgreSQL, la conexion se lee de `DB_URL`, `DB_USERNAME` y
  `DB_PASSWORD`, con los valores anteriores como respaldo, y se anade el perfil
  `h2` para arrancar sin base de datos. Con H2 se anade el perfil `postgres`.
- `server.port` admite `PORT`, la variable que fijan plataformas como Cloud Run.
- Se incluye el Maven Wrapper 3.3.2 oficial (modo solo script, Maven 3.9.9),
  copiado sin cambios de la salida del `maven-wrapper-plugin`: `mvnw.cmd` con
  saltos de linea CRLF y `mvnw` con permiso de ejecucion dentro del ZIP. Un
  `.gitattributes` conserva esos finales de linea al clonar.
- `java.version` pasa a 17 y se elimina la configuracion redundante del
  compilador: el padre de Spring Boot ya fija `release` a partir de ella.
- Se anade `springdoc-openapi-starter-webmvc-ui` 2.6.0, la linea compatible con
  Spring Boot 3.3: Swagger UI en `/swagger-ui.html`.
- Los textos libres del `pom.xml` se escapan y los nombres se normalizan sin
  tildes antes de convertirse en identificadores Java.
- El README explica el arranque en Windows y los errores frecuentes.

## Consecuencias

- Verificado arrancando el proyecto con `./mvnw` sin Maven en el `PATH`: el
  wrapper descarga Maven, la aplicacion arranca con el perfil `h2`, el CRUD
  responde y Swagger publica los endpoints. Los seis modelos compilan con
  `release 17`.
- El ZIP crece unos 20 KB por los scripts del wrapper.
