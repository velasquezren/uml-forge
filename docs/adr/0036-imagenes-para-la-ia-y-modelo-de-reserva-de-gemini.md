# 0036. Imagenes para la IA y modelo de reserva de Gemini

Fecha: 2026-09-27
Estado: Aceptado. Amplia el ADR 0035.

## Contexto

Subir la foto de un diagrama al asistente no generaba nada. Reproduciendolo con
una imagen de 800 KB aparecieron dos cortes antes de llegar a la IA:

1. nginx, la pasarela del contenedor web, rechaza por defecto los cuerpos de mas
   de 1 MB con `413 Request Entity Too Large`. La imagen viaja en base64 dentro
   de un JSON y crece un tercio.
2. Express, bajo NestJS, admite por defecto 100 KB de JSON. La API respondia
   `500 request entity too large`: ademas del limite, el filtro de excepciones
   convertia en error de servidor un error que es del cliente.

Resuelto eso, una de las pruebas fallo porque Gemini respondio 5xx durante los
tres reintentos: el modelo estaba saturado. El aviso de error desaparecia a los
pocos segundos y parecia que la IA no hacia nada.

## Decision

- El cuerpo JSON de la API admite 12 MB (`useBodyParser`) y nginx el mismo
  limite (`client_max_body_size 12m`) en `/api/`.
- El filtro de excepciones respeta el codigo 4xx de los errores del lector del
  cuerpo: 413 para un cuerpo demasiado grande, 400 para un JSON mal formado.
- La PWA reduce la foto antes de enviarla: lado mayor de 2000 px, JPEG al 88 %
  sobre fondo blanco. Acepta ficheros de hasta 20 MB, como las fotos de movil, y
  envia normalmente unos cientos de KB. Si el navegador no puede reducirla,
  envia el original.
- `GEMINI_FALLBACK_MODEL` (por defecto `gemini-flash-lite-latest`): si el modelo
  principal responde 404, 429 o 5xx, se repite la peticion con el de reserva,
  que tiene capacidad y cuota propias. Una clave invalida no cambia de modelo.
- Los avisos de error del asistente duran 12 segundos.

## Consecuencias

- La lectura de diagramas funciona con fotos reales a traves de la pila Docker.
- El modelo de reserva es algo menos preciso que el principal, pero responde
  cuando el principal esta saturado; vacio, la variable lo desactiva.
