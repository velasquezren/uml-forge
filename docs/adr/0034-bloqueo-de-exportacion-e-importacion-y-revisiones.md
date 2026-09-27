# 0034. Bloqueo de exportacion e importacion durante la edicion y revisiones

Fecha: 2026-09-27
Estado: Aceptado

## Contexto

Exportar mientras alguien esta cambiando el modelo produce un fichero con un
estado a medias, e importar sustituye el modelo completo para todos los
participantes, pisando lo que otra persona este escribiendo en ese momento.
Tampoco habia forma de saber que version del modelo contenia un fichero
exportado.

Se pidio la solucion mas sencilla posible.

## Decision

### Bloqueo

- Cada cambio local (operacion, arrastre de un nodo, deshacer o rehacer) marca a
  la persona como "editando" durante 3 segundos desde el ultimo cambio.
- El estado viaja por el canal de awareness de Hocuspocus (campo `editing`),
  igual que los cursores (ADR 0026): es informacion volatil de sesion, no parte
  del modelo. Solo se publica al entrar y al salir del estado, no en cada
  pulsacion.
- Mientras alguien, local o remoto, esta editando, los botones de exportar e
  importar se deshabilitan y explican quien esta editando; la confirmacion de
  una importacion pendiente tambien espera.
- Si una persona se desconecta a mitad de una edicion, el awareness expira su
  estado y el bloqueo se libera solo.

### Revisiones

- El documento Yjs tiene una raiz propia, `versioning`, con un contador
  `revision`. Cada cambio local lo incrementa, tambien deshacer y rehacer.
- Vive fuera de las cuatro raices del modelo para que el historial de deshacer
  no lo haga retroceder, y se persiste y sincroniza con el resto del documento
  sin cambiar nada en el servidor.
- Dos incrementos simultaneos pueden fundirse en uno: el contador no cuenta
  ediciones exactas, solo garantiza que crece cuando el modelo cambia.
- La exportacion anota la revision en el nombre del fichero
  (`proyecto-v12.xmi`) y en la extension `UMLForge` del XMI, junto al
  identificador del modelo. Al importar un fichero del mismo proyecto con una
  revision anterior a la actual se avisa de que se perderan los cambios
  posteriores.

## Consecuencias

- No hay bloqueos en servidor ni estados que limpiar: todo se deriva del CRDT y
  del awareness que ya existian.
- Trabajando sin conexion solo cuenta la edicion local, que es la unica posible.
- El numero de version es orientativo para las personas; la integridad de la
  fusion sigue dependiendo de Yjs.
