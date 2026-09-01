# Skills de UML Forge

Diez documentos ordenados que describen el proyecto completo, fase a fase. Cada
uno es Markdown autocontenido: sirve como skill en esta herramienta y se puede
pegar tal cual en otra ventana de IA con otro motor.

## Orden

| Orden | Skill                        | Estado                      |
| ----- | ---------------------------- | --------------------------- |
| 00    | `fase-00-contexto-y-reglas`  | Leer SIEMPRE primero        |
| 01    | `fase-01-metamodelo`         | Referencia. Ya construido   |
| 02    | `fase-02-api-nestjs`         | Completada                  |
| 03    | `fase-03-web-pwa`            | Completada                  |
| 04    | `fase-04-editor-canvas`      | Completada                  |
| 05    | `fase-05-offline-sync`       | Completada                  |
| 06    | `fase-06-codegen-springboot` | Pendiente                   |
| 07    | `fase-07-xmi`                | Pendiente                   |
| 08    | `fase-08-ia-servidor`        | Pendiente (Gemini + Ollama) |
| 09    | `fase-09-cierre`             | Pendiente                   |

## Como usarlos en otra ventana de IA

1. Pega el contenido de `fase-00-contexto-y-reglas/SKILL.md` como primer mensaje.
   Es el contrato: producto, stack, reglas inviolables y metodo de trabajo.
2. Pega `fase-01-metamodelo/SKILL.md`. Es la referencia de la API que ya existe;
   sin ella el motor reinventara tipos que ya estan escritos.
3. Pega el skill de la fase que toque y pide que la ejecute.
4. Al terminar, exige el bloque de verificacion que el propio skill define.

No hace falta pegar los skills de fases futuras: cada uno declara sus
prerrequisitos y solo se usa cuando le llega el turno.

## Que NO contienen

No contienen el codigo. Contienen el contrato: que construir, con que ordenes,
que escribir a mano, que trampas conocidas evitar y como se verifica. El codigo
lo escribe el motor de IA siguiendo el skill.
