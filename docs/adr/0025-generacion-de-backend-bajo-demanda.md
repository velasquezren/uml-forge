# 0025. Generacion del backend bajo demanda con descarga en ZIP

Fecha: 2026-09-01
Estado: Aceptado

## Contexto

`packages/codegen-springboot` existia desde la Fase 6 con sus seis modelos de
prueba y su compilacion real con Maven en integracion continua, pero ninguna
aplicacion lo importaba: la API no dependia del paquete y la PWA no ofrecia
ninguna accion para pedir el codigo. El escenario de aceptacion numero 6 de la
defensa ("se pulsa Generar backend y se descarga un ZIP que compila y arranca")
no se podia demostrar desde el producto.

Hacia falta decidir donde se ejecuta el generador, como viaja el resultado al
navegador y que se registra de cada intento.

## Decision

### 1. La generacion ocurre en el servidor

El endpoint es `POST /api/projects/:id/codegen/springboot`. El modelo se
reconstruye alli desde `YDocState` con `fromYDoc`, que es la version consolidada
del documento Yjs, no la copia que tenga un cliente concreto en memoria. Asi el
ZIP refleja lo que ven todos los participantes y no depende de que el navegador
que pulsa el boton este al dia.

A diferencia de la exportacion XMI, que se resuelve en el cliente (ADR 0024)
para seguir funcionando sin conexion, generar el backend exige el modelo
consolidado y produce un artefacto que solo tiene sentido con red.

### 2. Sincrono y en memoria

Generar los ficheros y comprimirlos tarda milisegundos y produce decenas de
kilobytes. No se monta cola, ni almacenamiento temporal, ni descarga diferida:
`archiver` escribe en un `Buffer` y la respuesta es el propio ZIP con
`Content-Disposition`. Se expone `X-Generated-Files` para que la interfaz pueda
decir cuantos ficheros se han generado.

### 3. `GenerationJob` es bitacora, no cola

La tabla `generation_jobs` del esquema Prisma se usa como registro de lo
ocurrido: se crea en `PROCESSING` y termina en `COMPLETED` con el nombre del
fichero o en `FAILED` con el motivo. Sirve para la defensa y para diagnosticar,
sin convertir la generacion en un proceso asincrono que nadie necesita.

### 4. Las opciones las valida el DTO, no el generador

`GenerateBackendDto` valida `groupId`, `artifactId` y `packageName` contra los
patrones de identificador Java y Maven, ademas del motor de base de datos y el
puerto. Todo es opcional: `resolveDefaultOptions` deriva del nombre del modelo
lo que el cliente no envie.

### 5. Cualquier miembro del proyecto puede generar

Se admiten `OWNER`, `EDITOR` y `VIEWER`. La operacion no modifica el modelo, y
un lector con acceso al diagrama tiene por definicion acceso al codigo que
describe.

## Consecuencias

- `apps/api` depende de `@uml-forge/codegen-springboot` y de `archiver`.
- El escenario 6 se puede demostrar de extremo a extremo desde el editor.
- Un modelo sin clases o ilegible devuelve `400` con el motivo, y el intento
  queda registrado como `FAILED`.
- Si en el futuro se generan proyectos grandes o varios objetivos a la vez,
  habra que revisar la decision de comprimir en memoria.
