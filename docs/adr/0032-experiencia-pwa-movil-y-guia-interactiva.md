# 0032. Experiencia PWA movil y guia interactiva

Fecha: 2026-09-20
Estado: Aceptado

## Contexto

Se requiere demostrar la ejecucion de la aplicacion en dispositivos moviles y la
interaccion con la IA local sin incurrir en el riesgo ni el sobrecoste de rehacer
el cliente en un framework movil nativo aislado (Flutter o React Native).
La aplicacion ya cuenta con configuracion PWA en Vite (`vite-plugin-pwa`),
service worker (`sw.ts`), persistencia en IndexedDB y una vista especializada
para modelado por voz e imagen (`/projects/$projectId/assistant`). Faltaba
hacer visible la capacidad de instalacion, facilitar el acceso directo desde el
movil y guiar al usuario en la demostracion presencial.

## Decision

- Se implementa el hook `usePwaInstall` para capturar el evento `beforeinstallprompt`,
  detectar la ejecucion en modo standalone e invocar el dialogo nativo de instalacion.
- Se crea el componente `MobilePwaGuideDialog` integrado en la barra lateral de
  `AppShell` y en la cabecera de `ProjectList`, con instrucciones paso a paso para
  Android e iOS, conexion en red local y explicacion de la arquitectura.
- En la lista de proyectos, cada tarjeta anade un acceso directo destacado a la vista
  del Asistente IA (`/projects/$projectId/assistant`), evitando que los usuarios en
  pantallas tactiles pequenas tengan que abrir el lienzo completo de escritorio.
- Se documenta la estrategia de empaquetado hibrido con Capacitor (`@capacitor/android`)
  como alternativa inmediata si un jurado o evaluador requiere estrictamente un fichero
  APK instalable.

## Consecuencias

- La experiencia movil queda formalizada y guiada dentro de la propia interfaz de usuario.
- Se preserva la base de codigo unica en TypeScript estricto, sin librerias externas
  adicionales ni duplicacion de logica.
- Se garantiza la demostracion combinada: celular en mano para dictado/fotos con IA
  y laptop proyectando el lienzo UML sincronizado en tiempo real por Yjs.
