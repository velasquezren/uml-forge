# 0031. Sesion en Docker local y espera de IA

Fecha: 2026-09-09
Estado: Aceptado

## Contexto

La pila Docker sirve HTTP con NODE_ENV=production. La cookie de renovacion
marcada Secure no viaja al acceder por una IP de la red local: el login funciona,
pero renovar la sesion devuelve 401. Ademas, Nginx corta las generaciones locales
antes del limite de 180 segundos del proveedor Ollama.

## Decision

- COOKIE_SECURE permite configurar la cookie tanto al crearla como al borrarla.
  Sin configuracion explicita se mantiene Secure en produccion. La pila Docker
  local usa false; un despliegue con HTTPS debe establecer true.
- El arranque del cliente y las respuestas 401 comparten la renovacion pendiente.
  Una renovacion fallida anterior no borra un login posterior. Cada solicitud
  se reintenta una sola vez y conserva el cuerpo y el token actualizado.
- El cliente de IA y Nginx esperan 210 segundos para permitir que el proveedor
  termine o informe de su limite de 180 segundos.
- El asistente explica que un 401 requiere iniciar sesion de nuevo.

## Consecuencias

Los usuarios de la pila local deben iniciar sesion una vez tras actualizar para
recibir la cookie con la configuracion nueva. Las cookies siguen siendo HttpOnly
y SameSite=Lax. El token de acceso permanece en memoria.
