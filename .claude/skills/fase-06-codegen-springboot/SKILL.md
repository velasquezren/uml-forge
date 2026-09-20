---
name: fase-06-codegen-springboot
description: Fase 6 de UML Forge. Generador de proyectos Spring Boot por capas a partir del modelo UML, con mapeo completo de tipos y relaciones, Swagger obligatorio, y compilacion real con Maven de los seis modelos de prueba.
---

# Fase 6: generador Spring Boot

## Prerrequisitos

`packages/uml-core` disponible. JDK 21 y Maven 3.9 instalados.

## Codigo de dominio: se escribe a mano

Plantillas Handlebars y logica de transformacion. Ninguna CLI las genera.

## Estructura generada (por capas, requisito explicito del docente)

```
{artifactId}/
  pom.xml
  docker-compose.yml
  README.md
  postman_collection.json
  src/main/resources/application.yml
  src/main/java/{basePackage}/
    Application.java
    config/       OpenApiConfig, CorsConfig, GlobalExceptionHandler
    model/        entidades JPA
    repository/   interfaces JpaRepository
    service/      interfaces + impl
    controller/   controladores REST
    dto/          Create, Update y Response por entidad
    mapper/       mapeadores manuales, sin MapStruct
    exception/    ResourceNotFoundException, ErrorResponse
```

## Mapeo de tipos

| UML        | Java          | PostgreSQL       |
| ---------- | ------------- | ---------------- |
| String     | String        | varchar(255)     |
| Text       | String        | text             |
| Integer    | Integer       | integer          |
| Long       | Long          | bigint           |
| Double     | Double        | double precision |
| BigDecimal | BigDecimal    | numeric(19,2)    |
| Boolean    | Boolean       | boolean          |
| Date       | LocalDate     | date             |
| DateTime   | LocalDateTime | timestamp        |
| UUID       | UUID          | uuid             |

## Mapeo estructural

- Clase concreta con `isInterface = false` produce `@Entity` y tabla en
  **snake_case plural**.
- Si ninguna propiedad tiene `isIdentifier`, se inyecta
  `@Id @GeneratedValue(strategy = IDENTITY) private Long id;`
- `isNullable = false` produce `@Column(nullable = false)` y `@NotNull` en el DTO.
- Asociacion uno a muchos: `@OneToMany(mappedBy)` mas `@ManyToOne @JoinColumn`.
- Asociacion muchos a muchos: `@ManyToMany` con `@JoinTable` en el lado navegable.
- Composicion: `cascade = CascadeType.ALL, orphanRemoval = true`.
- Agregacion: `cascade = {PERSIST, MERGE}`, **sin** `orphanRemoval`.
- Generalizacion: `@Inheritance(strategy = InheritanceType.JOINED)` en la
  superclase y `extends` en la subclase.
- `isInterface = true` produce una interfaz Java; la realizacion genera
  `implements`.
- Enum produce enum Java y `@Enumerated(EnumType.STRING)` en el campo.
- Relaciones bidireccionales: `@JsonManagedReference` y `@JsonBackReference` para
  evitar recursion infinita al serializar.
- `returnType: null` en una operacion UML es `void`.

La cardinalidad se decide con `parseMultiplicity` de `uml-core`, no analizando
la cadena a mano.

## CRUD por entidad

`GET /api/{recurso}` con paginacion `Pageable`, `GET /{id}`, `POST`,
`PUT /{id}`, `DELETE /{id}`.

## Obligatorio en el proyecto generado

- `springdoc-openapi-starter-webmvc-ui` con Swagger UI en `/swagger-ui.html`.
  **No es opcional**: el dia de la evaluacion alguien construye un frontend
  contra este backend en vivo y el contrato OpenAPI es como lo descubre.
- CORS totalmente abierto bajo el perfil `dev`.
- `docker-compose.yml` con PostgreSQL 16 listo para `docker compose up`.
- `README.md` con los tres comandos para arrancarlo.
- `postman_collection.json` generada desde el modelo.

## Validacion del generador

Seis modelos de prueba: herencia simple, herencia multiple por interfaces,
muchos a muchos, autorreferencia, composicion con borrado en cascada, y
enumeraciones.

**Los seis se COMPILAN de verdad con `mvn -q compile`.** No basta con validar
que la salida parece Java. Una validacion sintactica no detecta imports que
faltan, anotaciones JPA incompatibles, referencias a tipos inexistentes ni
relaciones bidireccionales mal mapeadas, que son exactamente los fallos que
apareceran delante del tribunal.

El test es obligatorio y bloqueante, y corre en CI en el trabajo
`codegen-compile` con JDK 21 Temurin. El script del paquete se llama `test:maven`.

## Criterio de terminado

- Los seis modelos compilan con Maven sin errores.
- El ZIP se descarga y se descomprime en un proyecto que arranca contra
  PostgreSQL y sirve Swagger UI.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde.

## Trampas conocidas

- Nombres UML con espacios o acentos: el generador **sanea** a identificador
  Java valido. El metamodelo no lo impide a proposito.
- Palabras reservadas de Java y de SQL como nombres de clase o atributo.
- Autorreferencia (`Employee` con jefe `Employee`): genera `@ManyToOne` a si
  misma y debe evitar recursion en la serializacion.
- Herencia JOINED mas `@ManyToMany` en la superclase: revisar el nombre de la
  tabla de union para que no colisione.
- El primer `mvn compile` descarga medio Maven Central: en CI hay que cachear.
