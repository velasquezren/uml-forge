# 0045. Cambios y borrados propuestos por la IA del chat

Fecha: 2026-10-29
Estado: Aceptado. Amplia los ADR 0035 y 0042.

## Contexto

En un proyecto real se pidio a la IA del chat "mejorar el modelo para que la
base de datos quede correcta" y aparecieron tres problemas:

- La IA solo podia proponer adiciones (regla del prompt y del esquema). No
  podia renombrar una clase ("tabla"), cambiar el tipo de un atributo ni
  eliminar nada, que es justo lo que suele pedir quien corrige un modelo.
- Dos propuestas generadas sobre el mismo estado del modelo se aplicaron una
  tras otra. La segunda se habia normalizado contra el modelo de antes de
  aplicar la primera: sus atributos repetidos fallaron y sus dos herencias se
  anadieron otra vez, con flechas duplicadas en el lienzo. El chat decia
  "2 ya no encajaban" sin explicar por que.
- Un corte de red al llamar a Gemini ("fetch failed") llegaba al chat como
  error, porque el SDK solo reintenta respuestas HTTP.

## Decision

- La propuesta del chat admite `changes`: renombrar (`rename` con `newName`),
  modificar (`update`) y eliminar (`delete`) clases, enumeraciones, atributos,
  operaciones y relaciones. La IA nombra los elementos como aparecen en el
  modelo; `mapAiChanges` los busca por nombre, sin distinguir mayusculas, y los
  traduce a `updateClass`, `deleteClass`, `updateAttribute`, `deleteRelationship`
  y demas operaciones del metamodelo. Lo que no existe se descarta.
- Eliminar una relacion entre dos clases borra todas las que coinciden, en
  cualquier sentido y, si se indica, de un tipo. Asi desaparece tambien una
  flecha duplicada.
- `normalizeAiOperations` aplica primero los cambios sobre una copia del modelo
  con `applyOperation` de `uml-core`, se queda solo con los que entran y
  normaliza las adiciones contra el modelo resultante. Un atributo anadido a
  una clase recien renombrada va a esa clase y no crea otra.
- Al pulsar "Aplicar", la API vuelve a normalizar la propuesta guardada contra
  el modelo vivo (`CollabService.currentModel`). Lo que otra propuesta o un
  editor ya hicieron se descarta en vez de duplicarse, y la tarjeta lo cuenta
  como omitido ("ya estaban en el modelo o no encajaban").
- El asistente de auditoria del editor (`UML_REFINE_INSTRUCTION`) sigue siendo
  solo aditivo: los borrados se revisan en el chat, donde todo el equipo los ve
  antes de que un editor los aplique.
- `GeminiClient` repite hasta tres veces la misma llamada cuando falla la
  conexion antes de recibir respuesta, y si aun asi falla el mensaje lo dice.

## Consecuencias

- La IA puede deshacer trabajo del equipo. La salvaguarda es la de siempre
  (ADR 0028): nada se aplica sin que un editor pulse "Aplicar", y el resumen
  nombra cada cambio con el nombre actual del elemento ("Eliminar la clase
  Administrador y sus relaciones").
- Una propuesta aplicada tarde puede quedar en menos cambios de los que se
  ven en su resumen: el resumen describe lo propuesto y el resultado, lo que
  realmente entro.
