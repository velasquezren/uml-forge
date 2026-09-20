# 0005. Compilacion real con Maven del codigo generado

Fecha: 2026-08-29
Estado: Aceptado

## Contexto

El criterio de aceptacion numero 6 exige que el ZIP generado contenga un proyecto
Spring Boot que "compila y arranca a la primera". Una validacion meramente
sintactica del Java emitido no demuestra nada de lo que importa: no detecta
imports que faltan, anotaciones JPA incompatibles, referencias a tipos
inexistentes, ni relaciones bidireccionales mal mapeadas. Esos son precisamente
los fallos que aparecerian delante del tribunal.

El entorno de desarrollo dispone de JDK 21 (Temurin 21.0.11) y Maven 3.9.6, y
GitHub Actions ofrece `actions/setup-java`, por lo que la compilacion real es
viable en ambos sitios.

## Decision

La bateria de pruebas del generador (Fase 6) compila de verdad, con
`mvn -q compile`, los proyectos producidos a partir de los seis modelos de
prueba: herencia simple, herencia multiple por interfaces, muchos a muchos,
autorreferencia, composicion con borrado en cascada y enumeraciones.

- El test es obligatorio y bloqueante: si Maven falla, la fase no esta terminada.
- Se ejecuta en CI en un trabajo propio, `codegen-compile`, con JDK 21 Temurin y
  cache de Maven. El trabajo esta ya declarado en `.github/workflows/ci.yml` y se
  activa solo cuando existe `packages/codegen-springboot/package.json`.
- Se separa del trabajo `verify` porque necesita una cadena de herramientas
  distinta y un tiempo de ejecucion muy superior.
- El script del paquete generador se llamara `test:maven`.

## Alternativas descartadas

- Validar solo con un analizador sintactico de Java: barato, pero no comprueba
  nada de la semantica del mapeo UML a JPA.
- Ejecutar tambien `mvn spring-boot:run` y comprobar el arranque: requiere una
  base de datos PostgreSQL viva por cada modelo y multiplica el tiempo de CI.
  El arranque contra PostgreSQL se verifica manualmente y en la prueba de
  aceptacion de la Fase 10.

## Consecuencias

- El trabajo `codegen-compile` sera el mas lento del pipeline; se acepta.
- La primera ejecucion descarga las dependencias de Spring Boot desde Maven
  Central; la cache de `actions/setup-java` amortiza las siguientes.
- Todo desarrollador que toque el generador necesita JDK 21 y Maven instalados,
  lo que queda documentado en el README raiz.
