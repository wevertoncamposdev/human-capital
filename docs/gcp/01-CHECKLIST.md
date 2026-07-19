# ✅ Checklist: Preparar Docker + Env para Cloud Run

**Objetivo**: Deixar tudo pronto para fazer build e deploy no Cloud Run (sem refactor de código ainda).

---

## 📋 Checklist Rápida

### Fase 1: Local Setup (30 min)

- [ ] Ler [02-DEPLOYMENT.md](02-DEPLOYMENT.md) - Setup overview
- [ ] Criar projeto GCP em [https://console.cloud.google.com](https://console.cloud.google.com)
- [ ] Instalar gcloud CLI: `curl https://sdk.cloud.google.com | bash`
- [ ] Autenticar: `gcloud auth login`
- [ ] Configurar PROJECT_ID: `gcloud config set project YOUR_PROJECT_ID`

### Fase 2: Variáveis de Ambiente (15 min)

- [ ] ✅ `.env.example` - Atualizado com variáveis GCP
- [ ] ✅ `.env.production` - Template para Cloud Run
- [ ] Copiar `.env.production` para `.env.production.local` (never commit!)
- [ ] Preencher valores sensíveis em `.env.production.local`:
  - [ ] `JWT_SECRET`
  - [ ] `GCP_PROJECT_ID`
  - [ ] `GCP_BUCKET_NAME`
  - [ ] `PII_MASTER_KEY`
  - [ ] `TOTP_ENCRYPTION_KEY`
  - [ ] `SMTP_*` (se usar email)
  - [ ] `GOOGLE_OAUTH_*`
  - [ ] `MICROSOFT_OAUTH_*`

### Fase 3: Docker Images (15 min)

- [ ] ✅ `backend/Dockerfile` - Atualizado (sem /app/uploads, com health check)
- [ ] ✅ `frontend/Dockerfile` - Sem mudanças (já bom)
- [ ] Testar build local:
  ```bash
  docker build backend -t terceirogestor-backend:test
  docker build frontend \
    --build-arg NEXT_PUBLIC_API_URL=/api \
    -t terceirogestor-frontend:test
  ```
- [ ] Testar run local:

  ```bash
  # Backend (precisa de DATABASE_URL)
  docker run \
    -e NODE_ENV=production \
    -e DATABASE_URL="..." \
    -p 8080:8080 \
    terceirogestor-backend:test

  # Frontend
  docker run \
    -e NODE_ENV=production \
    -e NEXT_PUBLIC_API_URL=/api \
    -p 3000:3000 \
    terceirogestor-frontend:test
  ```

### Fase 4: GCP Setup (1-2 horas)

#### 4.1 Habilitar APIs

- [ ] `gcloud services enable run.googleapis.com`
- [ ] `gcloud services enable sqladmin.googleapis.com`
- [ ] `gcloud services enable storage-component.googleapis.com`
- [ ] `gcloud services enable secretmanager.googleapis.com`
- [ ] `gcloud services enable cloudbuild.googleapis.com`

#### 4.2 Secrets Manager

- [ ] Criar secret `jwt-secret`
- [ ] Criar secret `cloudsql-database-url`
- [ ] Criar secret `pii-master-key`
- [ ] Criar secret `totp-encryption-key`
- [ ] (Opcionais) `smtp-password`, `google-oauth-secret`, `microsoft-oauth-secret`

```bash
# Exemplo
echo -n "YOUR_JWT_SECRET" | \
  gcloud secrets create jwt-secret --replication-policy="automatic" --data-file=-
```

#### 4.3 Cloud SQL

- [ ] Criar instância: `gcloud sql instances create terceirogestor-prod...`
- [ ] Criar database: `gcloud sql databases create terceirogestor...`
- [ ] Criar user: `gcloud sql users create app-user...`
- [ ] Obter `CONNECTION_NAME` para usar em DATABASE_URL
- [ ] Armazenar DATABASE_URL em Secret Manager

#### 4.4 Cloud Storage

- [ ] Criar bucket: `gsutil mb gs://terceirogestor-uploads-prod`
- [ ] Tornar privado: `gsutil uniformbucketlevelaccess set on`
- [ ] Habilitar versioning: `gsutil versioning set on`
- [ ] Dar permissoes ao backend service account (depois de deploy)

### Fase 5: Deploy (30 min)

- [ ] Build backend:
  ```bash
  gcloud builds submit backend \
    --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:v1.0.0
  ```
- [ ] Build frontend:
  ```bash
  gcloud builds submit frontend \
    --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:v1.0.0
  ```
- [ ] Deploy backend Cloud Run (ver [02-DEPLOYMENT.md](02-DEPLOYMENT.md), seção 3)
- [ ] Deploy frontend Cloud Run (ver [02-DEPLOYMENT.md](02-DEPLOYMENT.md), seção 4)

### Fase 6: Validation (10 min)

- [ ] Backend healthcheck: `curl $BACKEND_URL/health`
- [ ] Frontend loads: Acessar $FRONTEND_URL no browser
- [ ] Verificar logs:
  ```bash
  gcloud run logs read terceirogestor-backend --limit 50
  gcloud run logs read terceirogestor-frontend --limit 50
  ```

---

## 📐 Arquitetura Resultante (após esta fase)

```
Internet
  ↓
Frontend Cloud Run (3000)
  ├─ NEXT_PUBLIC_API_URL=/api
  └─ API_INTERNAL_URL=http://localhost:8080 (server-side)

  ↓ (calls /api/*)

Backend Cloud Run (8080)
  ├─ DATABASE_URL=mysql://user:pass@cloudsql-instance/db
  ├─ GCP_PROJECT_ID=meu-projeto
  ├─ GCP_BUCKET_NAME=terceirogestor-uploads-prod
  └─ JWT_SECRET=xxx (from Secret Manager)

  ↓
Cloud SQL (MySQL)
Cloud Storage (Bucket privado)
Secret Manager (Secrets)
```

---

## 🎯 Por Que Essa Ordem?

1. **Docker + Env primeiro**: Sem código mudando, só infraestrutura
2. **Simples de validar**: Basta rodar `docker build` e `docker run`
3. **Sem dependências**: Não precisa refactor de código de upload ainda
4. **Pronto para refactor**: Depois que isso funciona, podemos refactor o código

---

## 🚨 Erros Comuns

| Erro                                 | Solução                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| "Dockerfile COPY ./src/generated"    | Ver backend/Dockerfile linha 31 - prisma gerado                        |
| "Cloud SQL connection failed"        | Verificar DATABASE_URL, permissões de service account, Cloud SQL Proxy |
| "GCS permission denied"              | Dar role `roles/storage.objectAdmin` ao backend service account        |
| "Port 8080 not responding"           | Backend deve usar PORT=8080 (não 3001), Cloud Run injeta via ENV       |
| "NEXT*PUBLIC*\* variável não existe" | Frontend precisa ser built COM `NEXT_PUBLIC_API_URL=/api`              |

---

## 📚 Documentos Relacionados

- [02-DEPLOYMENT.md](02-DEPLOYMENT.md) - Guia detalhado
- [../../.env.production](../../.env.production) - Template para Cloud Run
- [../../.env.example](../../.env.example) - Referência de todas as variáveis
- [../../backend/Dockerfile](../../backend/Dockerfile) - Dockerfile atualizado
- [../../scripts/cloud-run-build.sh](../../scripts/cloud-run-build.sh) - Script de build automático

---

## 🎬 Próximas Fases (depois desta)

**Fase 2**: Conectar Frontend ↔ Backend via HTTPS Load Balancer + domain  
**Fase 3**: Database migrations via Cloud Run Job  
**Fase 4**: Refactor de uploads para Cloud Storage (FilesController + Signed URLs)

---

## ❓ Dúvidas?

1. **Q**: Por que PORT=8080 em vez de 3001?  
   **A**: Cloud Run padrão é 8080. Pode ser customizado, mas 8080 é a convenção.

2. **Q**: Preciso refatorar o código agora?  
   **A**: Não! Primeiro deixa rodar no Cloud Run (/app/uploads será vazio), depois refactora para Cloud Storage.

3. **Q**: E se tiver erro de DATABASE_URL?  
   **A**: Cloud SQL precisa estar UP e DATABASE_URL precisa ter formato correto. Ver 02-DEPLOYMENT.md seção 5.

4. **Q**: Como testar localmente antes de fazer push?  
   **A**: `docker build` + `docker run` com as mesmas ENV vars.

---

**Status**: ✅ Pronto para começar  
**Próxima Ação**: Ler [02-DEPLOYMENT.md](02-DEPLOYMENT.md) seção 1-4 e executar o checklist
