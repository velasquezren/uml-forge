# Despliegue en Google Cloud Run

Decisiones en el [ADR 0041](adr/0041-despliegue-en-cloud-run.md).

## Volver a desplegar

Con `gcloud` instalado y la sesion iniciada, desde la raiz del repositorio:

```bash
./scripts/deploy-cloudrun.sh software-2-2026 us-central1
```

El script construye las dos imagenes con Cloud Build, despliega
`uml-forge-api` y `uml-forge-web` e imprime sus URL. La base de datos y los
secretos se conservan entre despliegues.

## Preparacion inicial (una sola vez por proyecto)

Ya hecha en `software-2-2026`. Para otro proyecto, sustituye `P`:

```bash
P=software-2-2026; R=us-central1
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com sqladmin.googleapis.com aiplatform.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com --project=$P

# Imagenes
gcloud artifacts repositories create uml-forge --project=$P --location=$R \
  --repository-format=docker

# PostgreSQL 16
gcloud sql instances create uml-forge-db --project=$P --database-version=POSTGRES_16 \
  --edition=ENTERPRISE --tier=db-f1-micro --region=$R --storage-size=10
gcloud sql databases create umlforge --instance=uml-forge-db --project=$P
gcloud sql users create umlforge --instance=uml-forge-db --project=$P --password=<contrasena>

# Cuenta de servicio de la aplicacion
gcloud iam service-accounts create uml-forge-run --project=$P
for role in roles/cloudsql.client roles/aiplatform.user; do
  gcloud projects add-iam-policy-binding $P --role=$role \
    --member=serviceAccount:uml-forge-run@$P.iam.gserviceaccount.com
done

# Cuenta de servicio de Cloud Build
gcloud iam service-accounts create uml-forge-build --project=$P
B=serviceAccount:uml-forge-build@$P.iam.gserviceaccount.com
gcloud storage buckets add-iam-policy-binding gs://${P}_cloudbuild --member=$B \
  --role=roles/storage.objectViewer
gcloud artifacts repositories add-iam-policy-binding uml-forge --project=$P \
  --location=$R --member=$B --role=roles/artifactregistry.writer
gcloud projects add-iam-policy-binding $P --member=$B --role=roles/logging.logWriter
```

Secretos (valores aleatorios; la contrasena es la del usuario de Cloud SQL):

| Secreto                  | Contenido                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `uml-forge-database-url` | `postgresql://umlforge:<contrasena>@localhost/umlforge?host=/cloudsql/<P>:<R>:uml-forge-db&schema=public` |
| `uml-forge-jwt-access`   | 48 bytes aleatorios                                                                                       |
| `uml-forge-jwt-refresh`  | 48 bytes aleatorios                                                                                       |
| `uml-forge-cookie`       | 48 bytes aleatorios                                                                                       |

Cada uno se crea con `gcloud secrets create <nombre> --data-file=<fichero>` y se
da acceso a la aplicacion con
`gcloud secrets add-iam-policy-binding <nombre> --role=roles/secretmanager.secretAccessor --member=serviceAccount:uml-forge-run@$P.iam.gserviceaccount.com`.

## Diagnostico

```bash
gcloud run services logs read uml-forge-api --project=software-2-2026 --region=us-central1 --limit=50
```

Al arrancar, la API aplica las migraciones y, si la base de datos esta vacia,
crea los usuarios de demostracion (`admin@admin.com` / `password123`).
