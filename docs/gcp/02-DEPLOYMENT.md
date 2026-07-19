# Cloud Run Deployment Guide

Guia passo-a-passo para fazer build e deploy no Google Cloud Run.

---

## Prerequisites

- Google Cloud Project criado
- `gcloud` CLI instalado e autenticado
- Docker instalado (para build local)
- Cloud Build API habilitada (ou Docker local)

```bash
# Setup inicial
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Habilitar APIs necessárias
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-component.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 1. Build das Imagens Docker

### Opção A: Cloud Build (Recomendado)

```bash
cd /app/system_development

# Backend
gcloud builds submit backend \
  --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest,gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:v1.0.0

# Frontend
gcloud builds submit frontend \
  --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:latest,gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:v1.0.0
```

**Tempo**: ~3-5 minutos por imagem

### Opção B: Docker Local

```bash
# Backend
docker build backend \
  -t gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest \
  -t gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:v1.0.0

docker push gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest
docker push gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:v1.0.0

# Frontend
docker build frontend \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  -t gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:latest \
  -t gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:v1.0.0

docker push gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:latest
docker push gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:v1.0.0
```

---

## 2. Setup Secrets em Secret Manager

Armazene variáveis sensíveis:

```bash
# JWT Secret
echo -n "YOUR_JWT_SECRET_HERE" | \
  gcloud secrets create jwt-secret --replication-policy="automatic" --data-file=-

# Database URL
echo -n "mysql://root:PASSWORD@CLOUD_SQL_INSTANCE/terceirogestor?sslMode=require" | \
  gcloud secrets create cloudsql-database-url --replication-policy="automatic" --data-file=-

# PII Master Key
echo -n "YOUR_PII_MASTER_KEY_BASE64" | \
  gcloud secrets create pii-master-key --replication-policy="automatic" --data-file=-

# TOTP Encryption Key
echo -n "YOUR_TOTP_KEY_HEX" | \
  gcloud secrets create totp-encryption-key --replication-policy="automatic" --data-file=-

# SMTP Password
echo -n "YOUR_SMTP_PASSWORD" | \
  gcloud secrets create smtp-password --replication-policy="automatic" --data-file=-

# OAuth Secrets
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | \
  gcloud secrets create google-oauth-secret --replication-policy="automatic" --data-file=-

echo -n "YOUR_MICROSOFT_CLIENT_SECRET" | \
  gcloud secrets create microsoft-oauth-secret --replication-policy="automatic" --data-file=-
```

**Listar secrets criados**:

```bash
gcloud secrets list
```

---

## 3. Deploy Backend para Cloud Run

```bash
gcloud run deploy terceirogestor-backend \
  --image gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 100 \
  --port 8080 \
  --set-env-vars \
    NODE_ENV=production,\
    APP_NAME='Terceiro Gestor',\
    GCP_PROJECT_ID=YOUR_PROJECT_ID,\
    GCP_BUCKET_NAME=terceirogestor-uploads-prod,\
    GCS_SIGNED_URL_TTL_SENSITIVE=300,\
    GCS_SIGNED_URL_TTL_MEDIUM=1800,\
    GCS_SIGNED_URL_TTL_LOW=3600,\
    SMTP_HOST=smtp.gmail.com,\
    SMTP_PORT=587,\
    SMTP_USER='noreply@terceirogestor.com.br',\
    GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID,\
    MICROSOFT_OAUTH_CLIENT_ID=YOUR_MICROSOFT_CLIENT_ID,\
    GOOGLE_OAUTH_REDIRECT_URI='https://your-domain.com/api/registration/oauth/google/callback',\
    MICROSOFT_OAUTH_REDIRECT_URI='https://your-domain.com/api/registration/oauth/microsoft/callback',\
    WEB_URL='https://your-domain.com' \
  --update-secrets \
    JWT_SECRET=jwt-secret:latest,\
    DATABASE_URL=cloudsql-database-url:latest,\
    PII_MASTER_KEY=pii-master-key:latest,\
    TOTP_ENCRYPTION_KEY=totp-encryption-key:latest,\
    SMTP_PASS=smtp-password:latest,\
    GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-secret:latest,\
    MICROSOFT_OAUTH_CLIENT_SECRET=microsoft-oauth-secret:latest
```

**Parâmetros Explicados**:

- `--memory 512Mi`: 512MB de RAM (ajustar conforme necessário)
- `--cpu 1`: 1 CPU
- `--timeout 3600`: timeout de 1h (para migrations)
- `--max-instances 100`: escala automática até 100 instâncias
- `--port 8080`: porta interna (Cloud Run usa 8080 por padrão)
- `--no-allow-unauthenticated`: público (mude para `--allow-unauthenticated` apenas se necessário)

**Verificar deployment**:

```bash
gcloud run services list
gcloud run services describe terceirogestor-backend --region us-central1
```

---

## 4. Deploy Frontend para Cloud Run

```bash
gcloud run deploy terceirogestor-frontend \
  --image gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 50 \
  --port 3000 \
  --set-env-vars \
    NODE_ENV=production,\
    NEXT_PUBLIC_API_URL=/api,\
    API_INTERNAL_URL=http://terceirogestor-backend:8080
```

**Nota**: `API_INTERNAL_URL` deve apontar para backend Cloud Run

```bash
# Obter URL do backend
BACKEND_URL=$(gcloud run services describe terceirogestor-backend --format='value(status.url)' --region us-central1)
echo "Backend URL: $BACKEND_URL"

# Ou usar CloudRun service discovery
API_INTERNAL_URL="http://terceirogestor-backend:8080"
```

---

## 5. Setup Cloud SQL (Database)

### 5.1 Criar Instância Cloud SQL

```bash
gcloud sql instances create terceirogestor-prod \
  --database-version MYSQL_8_0 \
  --tier db-f1-micro \
  --region us-central1 \
  --backup \
  --enable-point-in-time-recovery
```

### 5.2 Criar Database

```bash
gcloud sql databases create terceirogestor \
  --instance terceirogestor-prod
```

### 5.3 Criar User

```bash
gcloud sql users create app-user \
  --instance terceirogestor-prod \
  --password
```

### 5.4 Obter Connection String

```bash
# Para usar com Cloud SQL Proxy
INSTANCE_CONNECTION=$(gcloud sql instances describe terceirogestor-prod --format='value(connectionName)')
echo "CONNECTION_NAME: $INSTANCE_CONNECTION"

# Format para DATABASE_URL:
# mysql://app-user:PASSWORD@INSTANCE_CONNECTION/terceirogestor?sslMode=require
```

### 5.5 Conectar Backend à Cloud SQL

```bash
# Atualizar DATABASE_URL secret
INSTANCE_CONNECTION=$(gcloud sql instances describe terceirogestor-prod --format='value(connectionName)')
echo -n "mysql://app-user:YOUR_PASSWORD@${INSTANCE_CONNECTION}/terceirogestor" | \
  gcloud secrets versions add cloudsql-database-url --data-file=-
```

---

## 6. Setup Cloud Storage (Bucket)

### 6.1 Criar Bucket

```bash
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://terceirogestor-uploads-prod

# Tornar privado (importante!)
gsutil uniformbucketlevelaccess set on gs://terceirogestor-uploads-prod

# Versioning (para backup)
gsutil versioning set on gs://terceirogestor-uploads-prod
```

### 6.2 Dar Permissões ao Backend Service Account

```bash
# Obter service account do Cloud Run
BACKEND_SA=$(gcloud run services describe terceirogestor-backend \
  --format='value(spec.template.spec.serviceAccountName)' \
  --region us-central1)

echo "Service Account: $BACKEND_SA"

# Dar permissão de ler/escrever no bucket
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:${BACKEND_SA} \
  --role=roles/storage.objectAdmin \
  --condition=None
```

---

## 7. Conectar Frontend e Backend via Load Balancer

### 7.1 Criar HTTPS Load Balancer

```bash
# Backend Service (backend Cloud Run)
gcloud compute backend-services create backend-service-api \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTP \
  --global

# Adicionar backend (Cloud Run)
gcloud compute backend-services add-backend backend-service-api \
  --global \
  --instance-group=... OR
  # Se usar Cloud Run Serverless NEG:
  gcloud compute network-endpoint-groups create serverless-api \
  --region=us-central1 \
  --network-endpoint-type=SERVERLESS \
  --cloud-run-service=terceirogestor-backend

gcloud compute backend-services add-backend backend-service-api \
  --global \
  --network-endpoint-group=serverless-api \
  --network-endpoint-group-region=us-central1
```

**Nota**: Use Terraform é mais simples (próximas fases).

---

## 8. Testar Deployment

### Backend

```bash
# Obter URL do backend
BACKEND_URL=$(gcloud run services describe terceirogestor-backend \
  --format='value(status.url)' --region us-central1)

echo "Testing: $BACKEND_URL/health"
curl $BACKEND_URL/health
```

### Frontend

```bash
# Obter URL do frontend
FRONTEND_URL=$(gcloud run services describe terceirogestor-frontend \
  --format='value(status.url)' --region us-central1)

echo "Testing: $FRONTEND_URL"
curl -I $FRONTEND_URL
```

### End-to-End

```bash
# 1. Acessar frontend
open $FRONTEND_URL

# 2. Fazer login
# 3. Testar upload de arquivo
# 4. Verificar logs
gcloud run logs read terceirogestor-backend --region us-central1 --limit 50
gcloud run logs read terceirogestor-frontend --region us-central1 --limit 50
```

---

## 9. Monitoramento & Logs

### Ver Logs em Tempo Real

```bash
# Backend
gcloud run logs read terceirogestor-backend --region us-central1 --follow

# Frontend
gcloud run logs read terceirogestor-frontend --region us-central1 --follow
```

### Métricas

```bash
# CPU, Memória, Requisições
gcloud monitoring metrics-descriptors list --filter='metric.type:run/*'

# Dashboard no Cloud Console:
# https://console.cloud.google.com/run?project=YOUR_PROJECT_ID
```

---

## 10. Atualizar Deployment (após mudanças)

```bash
# Rebuildar imagem
gcloud builds submit backend --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:v1.1.0

# Redeploy (Traffic vai aos poucos deixando v1.0.0 e subindo para v1.1.0)
gcloud run deploy terceirogestor-backend \
  --image gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:v1.1.0 \
  --region us-central1 \
  # ... (resto dos parâmetros)

# Ver histórico de versões
gcloud run revisions list --service=terceirogestor-backend --region us-central1
```

---

## 11. Troubleshooting

### Erro: "Cloud SQL connection failed"

```bash
# Verificar Cloud SQL permissões
gcloud sql instances describe terceirogestor-prod

# Verificar service account
gcloud run services describe terceirogestor-backend --region us-central1 | grep serviceAccount

# Testar conexão (via Cloud Shell)
gcloud sql instances describe terceirogestor-prod --format='value(connectionName)'
```

### Erro: "Permission denied" no Cloud Storage

```bash
# Verificar service account tem acesso ao bucket
gsutil iam ch serviceAccount:YOUR_SA:objectAdmin gs://terceirogestor-uploads-prod
```

### Erro: "Port already in use"

```bash
# Cloud Run sempre usa porta definida em --port flag
# Backend deve usar 8080 (não 3001)
# Frontend deve usar 3000
```

---

## 12. Cleanup

Se precisar deletar recursos:

```bash
# Delete Cloud Run services
gcloud run services delete terceirogestor-backend --region us-central1
gcloud run services delete terceirogestor-frontend --region us-central1

# Delete Cloud SQL
gcloud sql instances delete terceirogestor-prod

# Delete Cloud Storage bucket
gsutil -m rm -r gs://terceirogestor-uploads-prod

# Delete images
gcloud container images delete gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest --quiet
gcloud container images delete gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:latest --quiet
```

---

## Próximos Passos

1. ✅ Build & deploy na fase 1
2. 📝 Conectar via HTTPS Load Balancer (Terraform) - Fase 2
3. 📝 DB Migrations via Cloud Run Job - Fase 3
4. 📝 Refactor para Cloud Storage (uploads) - Fase 4

---

## Referências

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Connection](https://cloud.google.com/sql/docs/mysql/connect-run)
- [Cloud Storage Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Load Balancing for Cloud Run](https://cloud.google.com/load-balancing/docs/https/setting-up-https-serverless)
