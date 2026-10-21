#!/bin/sh
# Construye y despliega UML Forge en Cloud Run (ADR 0041).
#
#   ./scripts/deploy-cloudrun.sh [proyecto] [region]
#
# Requiere, creados una sola vez (ver docs/despliegue-cloud-run.md): el
# repositorio de Artifact Registry `uml-forge`, la instancia de Cloud SQL
# `uml-forge-db`, las cuentas de servicio `uml-forge-run` y `uml-forge-build` y
# los secretos `uml-forge-*` en Secret Manager.
set -eu

PROJECT="${1:-software-2-2026}"
REGION="${2:-us-central1}"
TAG="$(date +%Y%m%d-%H%M%S)"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/uml-forge"
RUN_SA="uml-forge-run@${PROJECT}.iam.gserviceaccount.com"
BUILD_SA="projects/${PROJECT}/serviceAccounts/uml-forge-build@${PROJECT}.iam.gserviceaccount.com"
SQL_INSTANCE="${PROJECT}:${REGION}:uml-forge-db"

echo "1/4 Construyendo imagenes ${TAG} con Cloud Build..."
gcloud builds submit --project="$PROJECT" --config=cloudbuild.yaml \
  --service-account="$BUILD_SA" \
  --substitutions="_REGION=${REGION},_TAG=${TAG}"

echo "2/4 Desplegando la API..."
# Una sola instancia: el documento Yjs de cada proyecto vive en memoria y todos
# los participantes deben conectarse al mismo proceso. Afinidad de sesion y una
# hora de timeout para las conexiones WebSocket de colaboracion.
gcloud run deploy uml-forge-api --project="$PROJECT" --region="$REGION" \
  --image="${REGISTRY}/api:${TAG}" --port=3000 \
  --service-account="$RUN_SA" --add-cloudsql-instances="$SQL_INSTANCE" \
  --min-instances=0 --max-instances=1 --session-affinity --timeout=3600 \
  --cpu=1 --memory=1Gi --allow-unauthenticated \
  --set-secrets="DATABASE_URL=uml-forge-database-url:latest,JWT_ACCESS_SECRET=uml-forge-jwt-access:latest,JWT_REFRESH_SECRET=uml-forge-jwt-refresh:latest,COOKIE_SECRET=uml-forge-cookie:latest" \
  --update-env-vars="NODE_ENV=production,COOKIE_SECURE=true,SEED_ON_START=true,THROTTLE_LIMIT=300,AI_PROVIDER=gemini,GEMINI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=gemini-3.5-flash,GEMINI_FALLBACK_MODEL=gemini-2.5-flash,CHAT_EVENT_BUS=postgres"

API_URL="$(gcloud run services describe uml-forge-api --project="$PROJECT" --region="$REGION" --format='value(status.url)')"
API_HOST="${API_URL#https://}"

echo "3/4 Desplegando la PWA (pasarela hacia ${API_URL})..."
gcloud run deploy uml-forge-web --project="$PROJECT" --region="$REGION" \
  --image="${REGISTRY}/web:${TAG}" --port=80 \
  --min-instances=0 --max-instances=2 --timeout=3600 \
  --cpu=1 --memory=256Mi --allow-unauthenticated \
  --update-env-vars="API_UPSTREAM=${API_URL},API_HOST=${API_HOST}"

WEB_URL="$(gcloud run services describe uml-forge-web --project="$PROJECT" --region="$REGION" --format='value(status.url)')"

echo "4/4 Autorizando el origen de la PWA en la API..."
gcloud run services update uml-forge-api --project="$PROJECT" --region="$REGION" \
  --update-env-vars="CORS_ORIGIN=${WEB_URL}"

echo
echo "UML Forge desplegado:"
echo "  Aplicacion: ${WEB_URL}"
echo "  API:        ${API_URL}"
