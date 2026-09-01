# 0015. Uso exclusivo de IndexedDB y prohibicion de localStorage

Fecha: 2026-08-30
Estado: Aceptado

## Contexto

Las aplicaciones web tradicionales suelen almacenar tokens JWT, modelos y
configuraciones en `localStorage`. En una PWA colaborativa y asistida por IA como
UML Forge, este enfoque presenta graves limitaciones:

1. **Riesgo de seguridad (XSS)**: Los datos en `localStorage` son accesibles por
   cualquier script inyectado.
2. **Naturaleza sincronica y bloqueo del hilo principal**: `localStorage` es
   sincrono y bloquea la UI en operaciones con modelos de datos o grafos complejos.
3. **Capacidad insuficiente**: `localStorage` esta limitado a ~5MB, insuficiente
   para almacenar estados de Yjs, snapshots de modelos o pesos de modelos WebLLM.
4. **Riesgo de desalojo silencioso**: Los navegadores pueden limpiar la cache
   offline si el almacenamiento no es explícitamente persistente.

## Decision

1. **Prohibicion estricta de `localStorage`**:
   - Ningun dato de modelo, estado de aplicacion o credencial puede persistirse
     en `localStorage`.
   - El access token JWT reside **estrictamente en memoria** dentro del store
     Zustand y se renueva automaticamente mediante cookies `httpOnly`.

2. **Capa de persistencia basada en IndexedDB**:
   - Todo almacenamiento local de datos se realiza a traves de IndexedDB de forma
     asincrona (`src/lib/storage.ts`).

3. **Solicitud de almacenamiento persistente**:
   - Al iniciar sesion, la aplicacion invoca `navigator.storage.persist()`.
   - Si el navegador deniega la persistencia (`persisted: false`), se muestra una
     advertencia visible al usuario indicando el riesgo de desalojo automatico.

## Consecuencias

- Maxima seguridad frente a vectores de ataque XSS.
- Interfaz reactiva y sin bloqueos de renderizado.
- Garantia de persistencia de datos offline y modelos locales.
