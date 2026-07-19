# Cloud Storage Refactor - Quick Start Guide

**Tempo de Leitura**: 10 min  
**Objetivo**: Overview rápido do refactor, estrutura e próximos passos

---

## 📋 O Que é Este Refactor?

Migração de upload de arquivos de filesystem local (`/app/uploads`) para **Google Cloud Storage** com **Signed URLs**.

### Benefícios

| Antes                                  | Depois                                      |
| -------------------------------------- | ------------------------------------------- |
| Filesystem efêmero (perda em redeploy) | Persistência automática em GCS              |
| Sem controle de acesso (público)       | Private bucket + Signed URLs (5-10 min TTL) |
| Backup manual (serviço docker)         | Cloud SQL nativo + Cloud Storage versioning |
| Não escala (disco cheio)               | Escalável infinito                          |

---

## 🏗️ Arquitetura

```
Cliente (Browser)
    ↓
Frontend (Cloud Run)
    ├─ Faz request: POST /api/files/health-documents
    └─ Recebe: { signedUrl: "https://..." }

    ↓ Upload de arquivo

Backend (Cloud Run)
    ├─ Valida JWT + autenticação
    ├─ Valida arquivo (size, type, ext)
    ├─ Gera path: health/{person_id}/{uuid}.pdf
    ├─ Upload para GCS
    └─ Salva path no banco (Prisma)

    ↓
Banco (Cloud SQL)
    └─ PersonAttachment { filePath: "health/{...}" }

    ↓
Cloud Storage (Bucket Privado)
    └─ gs://terceirogestor/tenant_id/health/{...}/file.pdf
```

---

## 📁 Estrutura de Pastas (Novo)

```
gs://terceirogestor/
├── {TENANT_ID}/
│   ├── health/              ← Laudos, diagnósticos (SENSÍVEL)
│   │   └── {PERSON_ID}/ → /files
│   ├── people/              ← RG, CPF, documentos (SENSÍVEL)
│   │   └── {PERSON_ID}/ → /files
│   ├── programs/            ← Relatórios, planos (MÉDIO)
│   ├── projects/            ← Documentos de projeto (MÉDIO)
│   ├── actions/             ← Fotos de ações (MÉDIO)
│   ├── avatars/             ← Fotos de perfil (BAIXO)
│   ├── pantry/              ← Estoque (MÉDIO)
│   ├── deposit/             ← Depósitos (MÉDIO)
│   └── tasks/               ← Tarefas (MÉDIO)
```

---

## 🔐 Segurança: Signed URLs

### Fluxo de Acesso

```
1. User: GET /api/files/{attachment_id}
   ↓
2. Backend:
   - Valida: JWT válido? Pode acessar person?
   - Busca filePath do banco
   - Determina TTL: health → 5min, programs → 30min
   - Gera Signed URL com TTL
   ↓
3. Retorna:
   {
     "signedUrl": "https://storage.googleapis.com/terceirogestor/...?auth=xyz&expires=123",
     "expiresIn": 300,
     "mimeType": "application/pdf"
   }
   ↓
4. Frontend:
   - Abre URL em <a>, <img>, <iframe>
   - Browser download direto do GCS
   - URL expira em 5-10 min → não reutilizável
```

### TTL por Tipo

| Tipo        | TTL    | Razão                               |
| ----------- | ------ | ----------------------------------- |
| `health/`   | 5 min  | Documentos de saúde muito sensíveis |
| `people/`   | 10 min | Documentos pessoais sensíveis       |
| `programs/` | 30 min | Relatórios moderadamente sensíveis  |
| `avatars/`  | 1 hora | Fotos público-friendly              |

---

## 📦 Arquivos de Documentação

```
docs/refactor/
├── 00-cloud-storage-overview.md      ← LER PRIMEIRO (este)
├── 01-files-controller-refactor.md   ← Implementação detalhada do código
├── 02-data-migration.md              ← Como migrar arquivos do disco para GCS
├── 03-testing.md                     ← Testes unitários, integração, e2e
└── 04-deployment.md                  ← Blue-green deployment em produção
```

---

## 🚀 Próximos Passos

### 1️⃣ Setup (1-2 dias)

- [ ] Criar bucket GCS: `gsutil mb gs://terceirogestor-uploads`
- [ ] Criar Service Account: `gcloud iam service-accounts create terceirogestor-backend`
- [ ] Dar permissões: `roles/storage.objectAdmin`
- [ ] Testar manualmente: upload 1 arquivo, gerar signed URL

```bash
# Criar bucket
gsutil mb gs://terceirogestor-uploads

# Criar service account
gcloud iam service-accounts create terceirogestor-backend

# Dar permissões
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member=serviceAccount:terceirogestor-backend@YOUR_PROJECT.iam.gserviceaccount.com \
  --role=roles/storage.objectAdmin
```

### 2️⃣ Implementação (3-4 dias)

- [ ] Instalar: `npm install @google-cloud/storage`
- [ ] Criar `cloud-storage.service.ts`
- [ ] Criar `files.service.ts`
- [ ] Refatorar `files.controller.ts`
- [ ] Testes unitários + integração

### 3️⃣ Migração de Dados (1-2 dias)

- [ ] Rodar script: `node scripts/migrate-uploads-to-gcs.js --dry-run`
- [ ] Verificar: `node scripts/migrate-uploads-to-gcs.js --validate`
- [ ] Executar em staging primeiro
- [ ] Executar em produção (com backup)

```bash
# Dry run
node backend/scripts/migrate-uploads-to-gcs.js --dry-run

# Validação
node backend/scripts/migrate-uploads-to-gcs.js --validate

# Executar (em produção, durante manutenção)
node backend/scripts/migrate-uploads-to-gcs.js --execute
```

### 4️⃣ QA & Deploy (1 semana)

- [ ] Testes e2e em staging
- [ ] Performance tests (upload/download 50MB)
- [ ] Testes de segurança (Signed URLs expiram)
- [ ] Blue-green deployment em produção
- [ ] Monitoramento 1a semana

---

## 💾 Principais Mudanças de Código

### Antes (diskStorage)

```typescript
@Post('health-documents')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({  // ← Salva em disk local
      destination: (_req, _file, cb) => {
        cb(null, '/app/uploads/health');
      },
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}.pdf`);
      },
    }),
  }),
)
uploadHealthDocument(@UploadedFile() file?: Express.Multer.File) {
  return {
    path: `/uploads/health/${file.filename}`,  // ← URL local
  };
}
```

### Depois (Cloud Storage)

```typescript
@Post('health-documents')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),  // ← Buffer em RAM
  }),
)
async uploadHealthDocument(
  @UploadedFile() file: Express.Multer.File,
  @Req() req: AuthenticatedRequest,
) {
  // 1. Validar arquivo
  const { personId } = req.body;
  this.filesService.validateFile(file, DocumentType.HEALTH);

  // 2. Upload para GCS
  const result = await this.filesService.uploadFile(
    file,
    DocumentType.HEALTH,
    personId,
    req.tenantId,
  );

  // 3. Salvar no banco
  const attachment = await this.prisma.personAttachment.create({
    data: {
      filePath: result.path,  // ← Path no GCS, não local
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      personId,
      tenantId: req.tenantId,
      uploadedByUserId: req.user.id,
    },
  });

  return { id: attachment.id, path: result.path };
}

// Novo endpoint: GET signed URL
@Get(':attachmentId')
async getFile(@Param('attachmentId') id: string, @Req() req) {
  const attachment = await this.prisma.personAttachment.findUnique({
    where: { id },
  });

  return this.filesService.generateAccessUrl(
    attachment.filePath,
    DocumentType.HEALTH,
    req.tenantId,
  );
}
```

---

## 🛠️ Variáveis de Ambiente Novas

Adicionar ao `.env`:

```bash
# Cloud Storage
GCP_PROJECT_ID=seu-projeto-gcp
GCP_BUCKET_NAME=terceirogestor-uploads
GCS_SIGNED_URL_TTL_SENSITIVE=300     # 5 min
GCS_SIGNED_URL_TTL_MEDIUM=1800       # 30 min
GCS_SIGNED_URL_TTL_LOW=3600          # 1 hora

# Autenticação (via Application Default Credentials)
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
```

---

## 📊 Estimativa de Custo (GCP)

### Cálculo Base (1 ONG, 1000 usuários, 500MB/mês uploads)

| Serviço                 | Uso          | Custo/mês    |
| ----------------------- | ------------ | ------------ |
| Cloud Storage (storage) | 500MB        | $0.02        |
| Cloud Storage (API)     | 10k requests | $0.10        |
| Egress                  | 100GB/mês    | $20.00       |
| **Total**               |              | **~$20/mês** |

**Nota**: Egress é caro. Se possível, usar assinadas URLs com `signedUrl` + browser download = menos egress.

---

## ⚠️ Riscos & Mitigações

| Risco                                | Mitigação                                        |
| ------------------------------------ | ------------------------------------------------ |
| Arquivo órfão (no GCS, não no banco) | Limpeza automática via lifecycle rules (90 dias) |
| 404 ao acessar                       | Testes de integridade pós-migração               |
| URL expirada muy rápido              | Refresh de URL no frontend (`<a>` com XHR)       |
| Performance degradada                | Caching de Signed URLs (5 min) no frontend       |
| Segurança: signed URL leakada        | TTL curto (5 min) + audit logging                |

---

## 📞 Emergency Contacts

Se algo der errado durante deploy:

1. **Rollback imediato**: `bash scripts/rollback.sh` (reverte tráfego para BLUE)
2. **Escalate**: Contatar Ops lead
3. **Investigation**: Coletar logs de `backend-green` para análise
4. **Comunicado**: Atualizar usuários no Slack #status

---

## 🔗 Links Úteis

- [Google Cloud Storage Node.js SDK](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [Signed URLs Documentation](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [NestJS File Upload Guide](https://docs.nestjs.com/techniques/file-upload)
- [Cloud Run Deployment](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)

---

## ✅ Checklist Final Antes de Começar

- [ ] Toda a documentação lida
- [ ] Entender fluxo de upload → GCS → signed URL
- [ ] Ambiente de desenvolvimento configurado (gcloud CLI)
- [ ] Permissões GCP validadas
- [ ] Testes locais rodando
- [ ] Team alinhado em cronograma
- [ ] Runbook pronto para oncall

---

**Status**: 📝 Planejamento  
**Próxima Ação**: Ler [`01-files-controller-refactor.md`](01-files-controller-refactor.md) para começar implementação

---

## Dúvidas Comuns

### P: E se o usuário estiver offline quando URL expirar?

**R**: A URL expira em 5-10 min. Se o usuário clicar depois, o frontend faz novo GET `/api/files/{id}` e obtém nova URL.

### P: Quanto custa o download de arquivo grande?

**R**: Apenas o egress (transferência de dados) é cobrado. Internamente no GCP é grátis.

### P: Como limpar arquivos órfãos?

**R**: Cloud Storage `lifecycle_rule` com `age: 90` delete automaticamente.

### P: Posso manter backup do filesystem?

**R**: Sim. Script de migração mantém backups em `/backups/blue-uploads-*.tar.gz` por 7 dias.

### P: E se a migração de dados falhar?

**R**: Rollback instantâneo: `docker-compose down`) e rodoar com banco backup (Cloud SQL PITR).
