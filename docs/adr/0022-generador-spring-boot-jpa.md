# 0022. Generador de proyectos Spring Boot 3 con Java 21, JPA y Maven

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

El objetivo fundamental de UML Forge es transformar modelos de clases UML 2.5
validados en un backend Java completo, funcional y compilable con Spring Boot 3.
El proyecto generado debe adherirse a los estandares de Spring Data JPA, Java 21
y Maven, resolviendo herencia, realizacion de interfaces, relaciones de cardinalidad
(1:1, 1:N, N:M), composicion con borrado en cascada, autorreferencias y enumeraciones.

## Decision

1. **Paquete dedicado `@uml-forge/codegen-springboot`**:
   - Compilacion dual ESM y CJS de acuerdo a ADR 0010.
   - Dependencia exclusiva de `@uml-forge/uml-core` como fuente de verdad.
   - Retorno mediante `Result<GeneratedFile[], CodegenError>` conforme a ADR 0007.

2. **Estructura del proyecto Spring Boot generado**:
   - `pom.xml`: Spring Boot 3.3.5, Java 21 (`maven-compiler-plugin`), dependencias
     de Spring Data JPA, Web, Validation, controladores PostgreSQL y H2 en runtime.
   - `model/`: Entidades JPA (`@Entity`, `@Table`), enumeraciones Java (`@Enumerated(EnumType.STRING)`),
     e interfaces UML (`isInterface: true`).
   - `repository/`: Interfaces `JpaRepository<Entity, Long>` para cada entidad concreta.
   - `service/`: Interfaces de servicio y `@Service` implementaciones transaccionales.
   - `controller/`: `@RestController` con endpoints CRUD (`GET`, `POST`, `PUT`, `DELETE`).
   - `dto/`: Records Java para solicitudes y respuestas REST.

3. **Mapeo estricto de relaciones y herencia**:
   - Herencia simple con `@Inheritance(strategy = InheritanceType.JOINED)` en clases padre.
   - Realizacion de interfaces multiples (`implements InterfaceA, InterfaceB`).
   - Relaciones N:M mapeadas con `@ManyToMany` y `@JoinTable`.
   - Composiciones mapeadas con `cascade = CascadeType.ALL, orphanRemoval = true`.
   - Autorreferencias recursivas mapeadas con `@ManyToOne` (padre) y `@OneToMany` (hijos).

4. **Verificacion con compilacion real Maven**:
   - Conforme a ADR 0005, el script `test:maven` ejecuta `mvn -q compile` sobre los
     6 modelos de prueba representativos, garantizando cero errores sintacticos o de enlace.

## Consecuencias

- Los proyectos generados compilan y arrancan directamente en entornos Java 21 con Maven.
- Se garantiza la integridad referencial y las mejores practicas de Spring Data JPA.
