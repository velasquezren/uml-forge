# 0026. Presencia y cursores remotos por el canal de awareness

Fecha: 2026-09-01
Estado: Aceptado

## Contexto

La Fase 4 dejo la colaboracion funcionando: el modelo converge y el editor sabia
cuantos participantes habia conectados. Faltaba la mitad visible del escenario
de aceptacion numero 1: ver **quien** esta trabajando y **donde** esta mirando.
El tipo `UserAwarenessState` ya declaraba un campo `cursor` que nadie escribia
ni dibujaba.

## Decision

### 1. El cursor viaja por awareness, nunca por el CRDT

`useYjsModel` expone `publishCursor`, que escribe el campo `cursor` del estado
de awareness del proveedor Hocuspocus. La posicion del puntero es informacion
volatil de sesion: no debe entrar en el documento Yjs, porque ensuciaria el
historial de deshacer, se persistiria con el modelo y viajaria en cada
sincronizacion de la cola offline.

### 2. Coordenadas del lienzo, no de la pantalla

Se publica la posicion traducida con `screenToFlowPosition`, de modo que cada
participante ve el cursor sobre el mismo punto del diagrama aunque tenga otro
encuadre o nivel de zoom. El dibujo usa `ViewportPortal` de React Flow y
compensa el zoom para que el puntero no crezca al acercar.

Como esa traduccion necesita el contexto de React Flow antes de que se monte el
lienzo, `EditorCanvas` pasa a envolverse en su propio `ReactFlowProvider`.

### 3. Limitacion de frecuencia a 60 milisegundos

`useCursorBroadcast` descarta los movimientos que llegan antes de 60 ms desde el
ultimo enviado. Sin ese limite cada pixel del recorrido generaria un mensaje. Al
salir del lienzo o desmontarlo se publica `null` y el cursor desaparece para los
demas.

### 4. La presencia se ve como avatares

`PresenceAvatars` muestra el usuario local primero y luego los remotos con el
mismo color que su cursor, agrupando en un contador a partir del quinto. La
barra inferior del editor sigue mostrando el total en linea.

## Consecuencias

- El escenario 1 de la defensa se puede demostrar completo con tres navegadores.
- El color de cada participante se calcula con `colorForUser`, ya existente, de
  forma estable entre sesiones.
- Los cursores no sobreviven a una desconexion, que es justo lo que se espera de
  la informacion de presencia.
