# Data Migration - Filesystem → Cloud Storage

**Objetivo**: Migrar todos os arquivos de `/app/uploads/*` (filesystem local) para Google Cloud Storage sem perder dados ou quebrar referencias no banco.

---

## 1. Estratégia Geral

### Fases

1. **Setup**: Preparar bucket GCS vazio
2. **Dry Run**: Executar migração em staging, validar integridade
3. **Executar**: Migração em produção (manutenção)
4. **Validar**: Verificar que todos os arquivos estão acessíveis
5. **Switchover**: Atualizar código para usar Cloud Storage
6. **Cleanup**: Deletar arquivos locais (manter backup 7 dias)

---

## 2. Pre-Migration Checklist

### Antes de Começar

- [ ] Backup completo do banco (`mysqldump`)
- [ ] Backup completo de `/app/uploads/*` (s3/gs)
- [ ] Verificar quota no GCP (limite de objetos no bucket)
- [ ] Validar Service Account tem permissão `storage.objectAdmin`
- [ ] Teste manual: upload/download 1 arquivo
- [ ] Comunicar aos usuários: "uploads estarão inacessiveis 2h na data X"

### Queries SQL para Entender Dados

```sql
-- Contar arquivos por tipo
SELECT
  SUBSTRING_INDEX(filePath, '/', 1) AS tipo,
  COUNT(*) AS total,
  SUM(fileSizeBytes) / 1024 / 1024 AS size_mb
FROM PersonAttachment
GROUP BY 1;

-- Listar arquivos de um tenant
SELECT id, filePath, fileSizeBytes FROM PersonAttachment
WHERE tenantId = 'TENANT_UUID'
LIMIT 10;

-- Encontrar referências órfãs (arquivo no banco, não no disco)
-- (Depois da migração, verificar o contrário)
```

---

## 3. Script de Migração (Node.js + @google-cloud/storage)

**Arquivo**: `backend/scripts/migrate-uploads-to-gcs.js`

```javascript
#!/usr/bin/env node
/**
 * Script de migração: filesystem → Google Cloud Storage
 *
 * Uso:
 *   node scripts/migrate-uploads-to-gcs.js --dry-run
 *   node scripts/migrate-uploads-to-gcs.js --execute
 *   node scripts/migrate-uploads-to-gcs.js --validate
 */

const fs = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
const { PrismaClient } = require("@prisma/client");

const dryRun = process.argv.includes("--dry-run");
const execute = process.argv.includes("--execute");
const validate = process.argv.includes("--validate");

if (!dryRun && !execute && !validate) {
  console.log(`
Uso: node migrate-uploads-to-gcs.js [opção]

Opções:
  --dry-run      Simula migração sem fazer upload
  --execute      Executa migração para GCS
  --validate     Valida que todos os arquivos foram migrados
  `);
  process.exit(1);
}

const prisma = new PrismaClient();
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// ============ DRY RUN ============
async function dryRun_() {
  console.log("🔍 DRY RUN: Analisando arquivos para migração...\n");

  const attachmentTypes = [
    "PersonAttachment",
    "PersonRecordAttachment",
    "ProgramAttachment",
    "ProjectAttachment",
    "ProjectActionAttachment",
    "PantryItemAttachment",
    "PantryDonorAttachment",
    "PantryEntryAttachment",
    "PantryExitAttachment",
    "DepositItemAttachment",
    "DepositDonorAttachment",
    "DepositEntryAttachment",
    "DepositExitAttachment",
    "TaskOrganizerAttachment",
  ];

  let totalFiles = 0;
  let totalSize = 0;

  for (const modelName of attachmentTypes) {
    const records = await prisma[modelName].findMany({
      select: { id: true, filePath: true, fileSizeBytes: true, tenantId: true },
    });

    if (records.length === 0) continue;

    console.log(`📋 ${modelName}: ${records.length} arquivos`);

    for (const record of records) {
      const localPath = path.join(
        UPLOADS_DIR,
        record.filePath.replace(/^\/uploads\//, ""),
      );
      const exists = fs.existsSync(localPath);

      if (!exists) {
        console.log(`  ⚠️  NÃO ENCONTRADO: ${record.filePath}`);
        continue;
      }

      const stat = fs.statSync(localPath);
      const documentType = record.filePath.split("/")[1]; // health, people, etc
      const filename = path.basename(record.filePath);
      const newPath = `${record.tenantId}/${documentType}/${record.id}/${filename}`;

      console.log(
        `  ✓ ${record.filePath} → ${newPath} (${(stat.size / 1024 / 1024).toFixed(2)}MB)`,
      );

      totalFiles++;
      totalSize += stat.size;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(
    `  Total: ${totalFiles} arquivos, ${(totalSize / 1024 / 1024 / 1024).toFixed(2)}GB`,
  );
  console.log(
    `  Tempo estimado: ${Math.ceil(totalFiles / 100)} min @ 100 files/min`,
  );
}

// ============ EXECUTE ============
async function execute_() {
  console.log("📤 EXECUTANDO migração para Cloud Storage...\n");

  const attachmentTypes = [
    "PersonAttachment",
    "PersonRecordAttachment",
    "ProgramAttachment",
    "ProjectAttachment",
    "ProjectActionAttachment",
    "PantryItemAttachment",
    "PantryDonorAttachment",
    "PantryEntryAttachment",
    "PantryExitAttachment",
    "DepositItemAttachment",
    "DepositDonorAttachment",
    "DepositEntryAttachment",
    "DepositExitAttachment",
    "TaskOrganizerAttachment",
  ];

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  // Transaction para manter consistência
  for (const modelName of attachmentTypes) {
    const records = await prisma[modelName].findMany({
      select: {
        id: true,
        filePath: true,
        fileSizeBytes: true,
        tenantId: true,
        mimeType: true,
      },
    });

    for (const record of records) {
      try {
        const localPath = path.join(
          UPLOADS_DIR,
          record.filePath.replace(/^\/uploads\//, ""),
        );

        if (!fs.existsSync(localPath)) {
          console.log(`⏭️  SKIP: Arquivo não existe: ${record.filePath}`);
          skipped++;
          continue;
        }

        const fileContent = fs.readFileSync(localPath);
        const filename = path.basename(record.filePath);
        const documentType = record.filePath.split("/")[1];

        // Novo path: {TENANT_ID}/{TIPO}/{ATTACHMENT_ID}/{FILENAME}
        const newPath = `${record.tenantId}/${documentType}/${record.id}/${filename}`;
        const gcsFile = bucket.file(newPath);

        // Upload com metadata
        await new Promise((resolve, reject) => {
          const stream = gcsFile.createWriteStream({
            metadata: {
              contentType: record.mimeType || "application/octet-stream",
              metadata: {
                originalPath: record.filePath,
                attachmentId: record.id,
                migratedAt: new Date().toISOString(),
              },
            },
          });

          stream.on("error", reject);
          stream.on("finish", resolve);
          stream.end(fileContent);
        });

        // Atualizar banco com novo path
        await prisma[modelName].update({
          where: { id: record.id },
          data: {
            filePath: `${documentType}/${record.id}/${filename}`, // Sem tenantId (implícito)
          },
        });

        console.log(`✓ ${newPath}`);
        uploaded++;
      } catch (error) {
        console.error(`✗ Erro ao migrar ${record.filePath}:`, error.message);
        failed++;
      }
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`  ✓ Uploaded: ${uploaded}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// ============ VALIDATE ============
async function validate_() {
  console.log("✅ VALIDANDO migração...\n");

  const attachmentTypes = [
    "PersonAttachment",
    "PersonRecordAttachment",
    "ProgramAttachment",
    "ProjectAttachment",
    "ProjectActionAttachment",
    "PantryItemAttachment",
    "PantryDonorAttachment",
    "PantryEntryAttachment",
    "PantryExitAttachment",
    "DepositItemAttachment",
    "DepositDonorAttachment",
    "DepositEntryAttachment",
    "DepositExitAttachment",
    "TaskOrganizerAttachment",
  ];

  let found = 0;
  let notFound = 0;

  for (const modelName of attachmentTypes) {
    const records = await prisma[modelName].findMany({
      select: { id: true, filePath: true, tenantId: true },
      take: 100, // Validar apenas 100 por tipo (rápido)
    });

    for (const record of records) {
      const gcpPath = `${record.tenantId}/${record.filePath}`;
      const [exists] = await bucket.file(gcpPath).exists();

      if (exists) {
        console.log(`✓ ${record.filePath}`);
        found++;
      } else {
        console.log(`✗ NÃO ENCONTRADO: ${record.filePath}`);
        notFound++;
      }
    }
  }

  console.log(`\n📊 Validação:`);
  console.log(`  ✓ Encontrados: ${found}`);
  console.log(`  ✗ Não encontrados: ${notFound}`);

  if (notFound > 0) {
    console.log(
      "\n⚠️  Alguns arquivos não foram migrados! Investigar antes de prosseguir.",
    );
    process.exit(1);
  }

  console.log(`\n✅ Validação OK! Pronto para switchover.`);
}

// ============ MAIN ============
async function main() {
  try {
    if (dryRun) {
      await dryRun_();
    } else if (execute) {
      await execute_();
    } else if (validate) {
      await validate_();
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

---

## 4. Plano de Execução (Produção)

### Dia X (Manutenção Planejada)

#### **Antes (T-2h)**

```bash
# 1. Backup banco
mysqldump -u root -p $MYSQL_DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Backup uploads locais
tar czf uploads_$(date +%Y%m%d_%H%M%S).tar.gz /app/uploads/

# 3. Upload backup para S3/GCS
gsutil -m cp uploads_*.tar.gz gs://backups-terceirogestor/
```

#### **Manutenção (T-2h até T)**

```bash
# 4. Parar aplicação (manutenção)
docker-compose scale backend=0 frontend=0

# 5. Dry run (validar)
node scripts/migrate-uploads-to-gcs.js --dry-run

# 6. Executar migração
node scripts/migrate-uploads-to-gcs.js --execute

# 7. Validar
node scripts/migrate-uploads-to-gcs.js --validate
```

#### **Depois (T)**

```bash
# 8. Deploy novo código (com FilesController refatorado)
docker-compose build backend
docker-compose up -d backend frontend

# 9. Verificar testes de smoke
curl http://localhost/api/health
curl http://localhost/api/files/{attachment-id}

# 10. Monitorar logs
docker-compose logs -f backend
```

---

## 5. Rollback Plan

Caso algo dê errado:

```bash
# 1. Parar aplicação
docker-compose down

# 2. Restaurar banco
mysql -u root -p $MYSQL_DATABASE < backup_*.sql

# 3. Restaurar código antigo
git checkout backend/src/core/files/files.controller.ts
docker-compose build backend

# 4. Recuperar filesystem (se houve limpeza)
tar xzf uploads_*.tar.gz -C /

# 5. Reiniciar
docker-compose up -d

# 6. Monitorar
docker-compose logs -f backend
```

---

## 6. Comunicação

### Email para Usuários

```
Assunto: [Manutenção] Otimização de Armazenamento - 2h Downtime

Prezados,

Realizaremos uma manutenção na data [X] das [HH]h às [HH+2]h para otimizar
nosso sistema de armazenamento de arquivos.

Durante este período:
- Sistema estará indisponível
- Uploads/downloads de documentos não funcionarão
- Operações continuam normalmente após T+2h

Impacto: Baixo (todos devem salvaguardar downloads antes de [HH]h)

Obrigado pela paciência!

---
Equipe de Tecnologia
```

---

## 7. Pós-Migração

### Tarefas de Conclusão

- [ ] Deletar `/app/uploads/*` após 7 dias (mantém backup local)
- [ ] Deletar backups locais do bucket `backup_*.tar.gz` após 30 dias
- [ ] Monitorar custos GCS (deve ser baixo para uploads)
- [ ] Documentar processo no README
- [ ] Atualizar runbook para oncall
- [ ] Treinar time em novo procedimento de upload

### Monitoramento (Semanas 1-4)

```
- Verificar 0 erros de "arquivo não encontrado" nos logs
- Métricas GCS: upload/download rate, latência, erros
- Espaço em disco local do backend (deve estar zero)
- Custo GCS na billing do projeto
```

---

## 8. SQL Queries Úteis

### Post-Migration Validation

```sql
-- Listar arquivos órfãos (no DB mas não no GCS)
-- (Executar após migração validada)
SELECT id, filePath FROM PersonAttachment
WHERE filePath NOT LIKE 'health/%' AND filePath NOT LIKE '/uploads/%'
LIMIT 100;

-- Contar arquivos por tenant (para validar com GCS)
SELECT tenantId, COUNT(*) FROM PersonAttachment
GROUP BY tenantId
ORDER BY COUNT(*) DESC;

-- Encontrar documentos muito antigos (para limpeza)
SELECT id, filePath, createdAt FROM PersonAttachment
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 YEAR)
LIMIT 100;
```

---

## 9. Referências

- [Google Cloud Storage Migration Guide](https://cloud.google.com/storage/docs/migrating)
- [Node.js GCS Client](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
