# 0041. Despliegue en Google Cloud Run

Fecha: 2026-10-18
Estado: Aceptado

## Contexto

Se pidio publicar UML Forge en Google Cloud Run, en el proyecto
`software-2-2026`, con la IA servida por Vertex AI (ADR 0040).

La aplicacion tiene tres piezas con requisitos distintos: la PWA estatica, la API
con un canal WebSocket de colaboracion cuyo documento Yjs vive en memoria, y
PostgreSQL.

## Decision

- **Base de datos**: Cloud SQL para PostgreSQL 16, instancia `uml-forge-db`
  `db-f1-micro` en `us-central1`, la mas pequenna. La API se conecta por el
  socket de Cloud SQL (`?host=/cloudsql/...`), sin IP publica que abrir.
- **API**: servicio `uml-forge-api` con **una sola instancia** como maximo,
  afinidad de sesion y una hora de timeout. Con dos instancias, dos personas en
  el mismo proyecto podrian quedar en procesos distintos y no verse. Escalar
  exigiria un bus compartido para Hocuspocus, fuera del alcance del proyecto.
- **PWA**: servicio `uml-forge-web` con el mismo nginx que en Docker. Su
  configuracion pasa a ser una plantilla: `API_UPSTREAM` y `API_HOST` apuntan al
  contenedor `api` en Docker Compose y a la URL https de `uml-forge-api` en
  Cloud Run, con su Host y SNI, que Cloud Run necesita para enrutar. Asi el
  navegador sigue viendo un unico origen y la cookie de refresco funciona.
- **Secretos**: la URL de la base de datos y los secretos JWT y de cookies se
  generan al azar y viven en Secret Manager; solo la cuenta de servicio
  `uml-forge-run` puede leerlos. Esa cuenta tiene ademas `cloudsql.client` y
  `aiplatform.user`, y nada mas.
- **Construccion**: Cloud Build con `cloudbuild.yaml` y una cuenta de servicio
  propia, `uml-forge-build` (lectura del codigo subido, escritura en Artifact
  Registry y en los registros): los proyectos nuevos ya no conceden permisos
  amplios a la cuenta por defecto. `.gcloudignore` deja fuera `node_modules` y,
  sobre todo, el `.env`.
- **Proxy de confianza**: la API activa `trust proxy`. Detras de nginx y del
  balanceador de Google, `req.ip` era la del proxy y el limitador de peticiones
  metia a todos los usuarios en el mismo cupo.
- `scripts/deploy-cloudrun.sh` construye y despliega ambos servicios.

## Consecuencias

- Coste aproximado en reposo: la instancia de Cloud SQL (unos 10 USD al mes);
  los servicios de Cloud Run escalan a cero cuando nadie los usa. Mientras hay
  alguien conectado al lienzo, la conexion WebSocket mantiene la API activa.
- El primer acceso tras un rato sin uso tarda unos segundos (arranque en frio).
- Verificado con la bateria E2E de Playwright contra la URL publica, incluida la
  colaboracion entre dos usuarios, y descargando y arrancando el backend
  Spring Boot generado en la nube.
