# Cloud Storage Refactor - Visão Geral

**Status**: Planejamento (Fase 1 - MVP para GCP)  
**Data**: Abril 2026  
**Escopo**: Migrar upload de arquivos de filesystem local para Google Cloud Storage com Signed URLs

---

## 1. Motivação

### Problema Atual

- **Filesystem local**: Arquivos em `/uploads/[tipo]/[arquivo]`
- **Sem controle de acesso**: Qualquer pessoa com URL conhecida acessa
- **Dados sensíveis públicos**: Documentos de saúde, RG, diagnósticos expostos
- **Não escala em Cloud Run**: Filesystem é efêmero (perda em redeploy)
- **Backup manual**: Serviço separado no docker-compose

### Solução

- **Cloud Storage Bucket**: Privado, com controle de acesso
- **Signed URLs**: Links autenticados com TTL curto (5-10 min para sensíveis)
- **Gerenciamento centralizado**: GCP cuida de backups, versionamento, PITR
- **Compliance**: Documentos sensíveis nunca expostos publicamente

---

## 2. Arquitetura Proposta

### Estrutura de Pastas (Cloud Storage)

```
gs://terceirogestor/
├── {TENANT_ID}/
│   ├── health/
│   │   └── {PERSON_ID}/
│   │       ├── {uuid}.pdf
│   │       └── {uuid}.pdf
│   ├── people/
│   │   └── {PERSON_ID}/
│   │       ├── {uuid}.pdf
│   │       └── {uuid}.pdf
│   ├── avatars/
│   │   └── {USER_ID}/
│   │       └── {uuid}.jpg
│   ├── programs/
│   │   └── {PROGRAM_ID}/
│   │       └── {uuid}.pdf
│   ├── projects/
│   │   └── {PROJECT_ID}/
│   │       └── {uuid}.pdf
│   ├── actions/
│   │   └── {ACTION_ID}/
│   │       └── {uuid}.pdf
│   ├── pantry/
│   │   └── {PANTRY_ID}/
│   │       └── {uuid}.pdf
│   ├── deposit/
│   │   └── {DEPOSIT_ID}/
│   │       └── {uuid}.pdf
│   └── tasks/
│       └── {TASK_ID}/
│           └── {uuid}.pdf
```

**Padrão**: `{TIPO}/{ENTIDADE_ID}/{FILENAME}`

- Isola por tenant automaticamente
- Facilita limpeza (delete todas as pastas de um tenant)
- Agrupa por contexto (health/people para PII)

---

## 3. Fluxo de Upload (Novo)

```
1. Frontend envia POST /api/files/health-documents
   ├─ JWT token incluído
   └─ Arquivo em multipart/form-data

2. Backend (FilesController)
   ├─ Valida autenticação (JwtAuthGuard)
   ├─ Valida tenancy (tenantMiddleware)
   ├─ Valida tipo de arquivo (mimetype, extensão)
   ├─ Gera path: health/{PERSON_ID}/{UUID}.pdf
   ├─ Faz upload para Cloud Storage
   └─ Salva filePath no banco (Prisma)

3. Banco (PersonAttachment)
   ├─ id: UUID
   ├─ tenantId: UUID
   ├─ personId: UUID
   ├─ filePath: "health/{PERSON_ID}/{UUID}.pdf"
   ├─ mimeType: "application/pdf"
   ├─ fileSizeBytes: 1256000
   └─ uploadedByUserId: UUID

4. Resposta ao Frontend
   ├─ HTTP 200 OK
   └─ { path: "health/{PERSON_ID}/{UUID}.pdf", id: UUID }
```

---

## 4. Fluxo de Download (Novo com Signed URLs)

```
1. Frontend precisa acessar arquivo
   ├─ Exemplo: <a href="/api/files/{ATTACHMENT_ID}">Download</a>

2. Backend (FilesController novo endpoint GET)
   ├─ Valida autenticação (JwtAuthGuard)
   ├─ Busca no banco: SELECT filePath FROM PersonAttachment WHERE id = ?
   ├─ Valida tenancy (personId pertence a tenant_id do usuário?)
   ├─ Determina tipo de documento (health/ → 5 min, programs/ → 30 min)
   ├─ Gera Signed URL usando Google Cloud Storage SDK
   │  └─ URL expira em 5-10 minutos (sensíveis) ou 30 min (médios)
   └─ Retorna Signed URL

3. Frontend recebe Signed URL
   ├─ Abre em <a> ou <img> ou <iframe>
   └─ Browser baixa direto do Cloud Storage

4. Cloud Storage
   ├─ Valida assinatura da URL
   ├─ Verifica se não expirou
   ├─ Serve arquivo ou erro 403 (expirada)
   └─ Retorna arquivo ao navegador
```

---

## 5. Estratégia de TTL (Time-to-Live)

Conforme sensibilidade do documento:

| Tipo      | Pasta       | TTL    | Razão                             |
| --------- | ----------- | ------ | --------------------------------- |
| **Alto**  | `health/`   | 5 min  | Laudos, diagnósticos, prescrições |
| **Alto**  | `people/`   | 10 min | RG, CPF, certidão, comprovante    |
| **Médio** | `programs/` | 30 min | Planos de atendimento, relatórios |
| **Médio** | `projects/` | 30 min | Documentos de projeto             |
| **Médio** | `actions/`  | 30 min | Fotos de ações, relatórios        |
| **Baixo** | `avatars/`  | 1 hora | Fotos de perfil                   |

---

## 6. Variáveis de Ambiente Necessárias

```bash
# .env
# Cloud Storage
GCP_PROJECT_ID=seu-projeto-gcp
GCP_BUCKET_NAME=terceirogestor
GCS_SIGNED_URL_TTL_SENSITIVE=300  # 5 min em segundos
GCS_SIGNED_URL_TTL_MEDIUM=1800    # 30 min
GCS_SIGNED_URL_TTL_LOW=3600       # 1 hora

# Autenticação do backend (via Application Default Credentials ou service account)
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
```

---

## 7. Dependências npm Necessárias

**Adicionar ao `backend/package.json`**:

```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.0.0"
  }
}
```

---

## 8. Configuração Cloud Storage

### Bucket Terraform

```hcl
resource "google_storage_bucket" "uploads" {
  name          = "terceirogestor-uploads"
  location      = "US"
  force_destroy = false

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true  # Point-in-time recovery
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 3  # Manter últimas 3 versões
    }
    action {
      delete = true
    }
  }

  lifecycle_rule {
    condition {
      age = 90  # Deletar após 90 dias de inatividade
    }
    action {
      delete = true
    }
  }
}

# Service Account para o backend
resource "google_service_account" "backend" {
  account_id = "terceirogestor-backend"
}

# Permissões: Ler/escrever no bucket
resource "google_storage_bucket_iam_member" "backend" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend.email}"
}
```

---

## 9. Plano de Implementação (Fases)

### Fase 1: Setup (1-2 dias)

- [ ] Criar bucket GCS no GCP
- [ ] Configurar Service Account
- [ ] Adicionar permissões
- [ ] Instalar `@google-cloud/storage`

### Fase 2: Refactor Backend (3-4 dias)

- [ ] Criar `cloud-storage.service.ts`
- [ ] Refatorar `FilesController` para usar GCS SDK
- [ ] Ajustar tipos TypeScript
- [ ] Testes unitários

### Fase 3: Migração de Dados (1-2 dias)

- [ ] Criar script de migração (filesystem → GCS)
- [ ] Atualizar `filePath` no banco
- [ ] Validação de integridade

### Fase 4: QA & Deploy (1 semana)

- [ ] Testes de upload/download em staging
- [ ] Testes de performance
- [ ] Testes de segurança (signed URLs)
- [ ] Deploy em produção (blue-green)

---

## 10. Riscos & Mitigações

| Risco                       | Impacto                | Mitigação                                          |
| --------------------------- | ---------------------- | -------------------------------------------------- |
| **Arquivos órfãos**         | Espaço/$ gasto         | Script de limpeza de arquivos sem referência no DB |
| **Integridade de filePath** | 404 ao acessar         | Testes automatizados + audit log                   |
| **Assinatura inválida**     | Download quebrado      | Centralizar geração de URL em 1 método             |
| **TTL muito curto**         | UX ruim (URL expirada) | Ajustar per-tipo, implementar refresh              |
| **Performance**             | Múltiplos GETs/POST    | Implementar cache na aplicação para URLs           |

---

## 11. Próximos Documentos

- [`01-files-controller-refactor.md`](01-files-controller-refactor.md) - Implementação detalhada
- [`02-cloud-storage-service.md`](02-cloud-storage-service.md) - SDK wrapper
- [`03-data-migration.md`](03-data-migration.md) - Plano de migração de dados
- [`04-testing.md`](04-testing.md) - Testes unitários e e2e
- [`05-deployment.md`](05-deployment.md) - Prod deployment com zero downtime

---

## 12. Referências

- [Google Cloud Storage Node.js Client](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [Signed URLs Documentation](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Cloud Storage Security Best Practices](https://cloud.google.com/storage/docs/best-practices/security)
- [NestJS File Upload Tutorial](https://docs.nestjs.com/techniques/file-upload)
