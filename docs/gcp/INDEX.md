# 📚 Índice Completo de Documentação - Terceiro Gestor na GCP

Bem-vindo ao centro de documentação para a migração do Terceiro Gestor para Google Cloud Platform!

---

## 🗂️ Estrutura de Diretórios

```
docs/
├── gcp/                                     ← Você está aqui
│   ├── README.md                           (Visão geral da migração)
│   ├── 00-PRONTO.md                        (Status: Fase 1 concluída)
│   ├── 01-CHECKLIST.md                     (Checklist: 6 fases práticas)
│   ├── 02-DEPLOYMENT.md                    (Guia técnico: 12 seções)
│   └── INDEX.md                            (Você está aqui)
├── refactor/                               (Próxima fase: Code refactoring)
│   ├── README.md
│   ├── INDEX.md
│   ├── 00-cloud-storage-overview.md
│   ├── 01-files-controller-refactor.md
│   ├── 02-data-migration.md
│   ├── 03-testing.md
│   └── 04-deployment.md
├── canonical-business-structure.md
├── canonical-web-client-standard.md
├── marco-zero-1.0-audit-matrix-template.md
├── marco-zero-1.0-audit-matrix.csv
├── marco-zero-1.0-implementation-plan.md
├── marco-zero-1.0.md
└── module-canonical-checklist.md
```

---

## 📖 Guias por Fase

### 🟢 Fase 1: Docker + Variáveis de Ambiente (COMPLETO ✅)

**Status**: Pronto para Cloud Run  
**Tempo**: ~4-5 horas  
**Objetivo**: Preparar Docker e variáveis de ambiente para Cloud Run

**Leia nesta ordem**:

1. [README.md](README.md) - 5 min - Visão geral
2. [00-PRONTO.md](00-PRONTO.md) - 10 min - O que foi feito
3. [01-CHECKLIST.md](01-CHECKLIST.md) - 20 min - Tarefas a executar

**Arquivos modificados**:

- `backend/Dockerfile` - Health check adicionado, /app/uploads removido
- `.env.example` - Variáveis GCP adicionadas
- `.env.production` - Template novo para Cloud Run
- `scripts/cloud-run-build.sh` - Script novo de build automático

**Próximo**: Executar a Fase 4 do [01-CHECKLIST.md](01-CHECKLIST.md) (GCP Setup)

---

### 🟡 Fase 2: GCP Setup + Deploy Inicial (PRÓXIMA)

**Status**: Documentação em preparação  
**Tempo**: ~4 horas  
**Objetivo**: Setup GCP, Cloud SQL, Cloud Storage, Secrets Manager, Deploy

**Leia**:

1. [02-DEPLOYMENT.md](02-DEPLOYMENT.md) - Guia técnico com todos os comandos
2. [01-CHECKLIST.md](01-CHECKLIST.md#fase-4-gcp-setup-1-2-horas) - Fase 4 do Checklist

**Próximo**: Configurar Load Balancer (Fase 3)

---

### 🟠 Fase 3: HTTPS Load Balancer + Domain Customizado

**Status**: Por documentar  
**Tempo**: ~3 horas  
**Objetivo**: Conectar Frontend ↔ Backend via HTTPS Load Balancer, mapear apex domain

**Referência**: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#7-conectar-frontend-e-backend-via-load-balancer) - Seção 7

**Próximo**: Refactor de uploads para Cloud Storage (Fase 4)

---

### 🔴 Fase 4: Refactor de Uploads para Cloud Storage

**Status**: Documentação em `/docs/refactor/`  
**Tempo**: ~1-2 semanas  
**Objetivo**: Refactor FilesController para usar Cloud Storage SDK + Signed URLs

**Leia em ordem**:

1. [../refactor/README.md](../refactor/README.md) - Visão geral
2. [../refactor/00-cloud-storage-overview.md](../refactor/00-cloud-storage-overview.md) - Arquitetura
3. [../refactor/01-files-controller-refactor.md](../refactor/01-files-controller-refactor.md) - Implementação
4. [../refactor/02-data-migration.md](../refactor/02-data-migration.md) - Scripts de migração
5. [../refactor/03-testing.md](../refactor/03-testing.md) - Testes
6. [../refactor/04-deployment.md](../refactor/04-deployment.md) - Blue-green deployment

**Próximo**: Monitoring + Performance (Fase 5)

---

### 🟣 Fase 5: Monitoring & Performance (Contínuo)

**Status**: Por fazer  
**Tempo**: 1+ semana  
**Objetivo**: Setup monitoring, alertas, otimizar performance

**Referências**:

- Cloud Run Metrics: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#9-monitoramento--logs) - Seção 9
- Cloud SQL Performance: https://cloud.google.com/sql/docs/mysql/best-practices
- Cloud Storage Optimization: https://cloud.google.com/storage/docs/best-practices

---

## 🎯 Quick Navigation

### Preciso...

| Tarefa                              | Ir Para                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Entender o projeto                  | [README.md](README.md)                                                                     |
| Saber o que foi feito em Fase 1     | [00-PRONTO.md](00-PRONTO.md)                                                               |
| Ver as tarefas que preciso executar | [01-CHECKLIST.md](01-CHECKLIST.md)                                                         |
| Fazer build e deploy                | [02-DEPLOYMENT.md](02-DEPLOYMENT.md#1-build-das-imagens-docker)                            |
| Setup Cloud SQL                     | [02-DEPLOYMENT.md](02-DEPLOYMENT.md#5-setup-cloud-sql-database)                            |
| Setup Cloud Storage                 | [02-DEPLOYMENT.md](02-DEPLOYMENT.md#6-setup-cloud-storage-bucket)                          |
| Troubleshoot erro                   | [02-DEPLOYMENT.md](02-DEPLOYMENT.md#11-troubleshooting)                                    |
| Refactor FilesController            | [../refactor/01-files-controller-refactor.md](../refactor/01-files-controller-refactor.md) |
| Escrever testes                     | [../refactor/03-testing.md](../refactor/03-testing.md)                                     |
| Fazer migração de dados             | [../refactor/02-data-migration.md](../refactor/02-data-migration.md)                       |

---

## 📊 Timeline Global

```
Semana 1:
├─ Dia 1-2: Docker + Env (Fase 1) ✅ COMPLETO
├─ Dia 3-4: GCP Setup + Deploy (Fase 2) ⏳ NEXT

Semana 2:
├─ Dia 5-6: HTTPS Load Balancer (Fase 3) ⏳
├─ Dia 7: Database migrations ⏳

Semana 3-4:
├─ Dias 8-15: Refactor Uploads (Fase 4) ⏳

Semana 5:
├─ Dia 16+: Monitoring + Performance (Fase 5) ⏳
```

**Total**: ~4-5 semanas para Production Ready

---

## 🔑 Conceitos Principais

### Cloud Run

- Serverless container orchestration (pay-per-use)
- Auto-scaling automático
- HTTPS + domain gratuito
- Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#prerequisites)

### Cloud SQL

- Managed MySQL database com backups automáticos
- High availability (replicação)
- Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#5-setup-cloud-sql-database)

### Cloud Storage

- Bucket privado para uploads
- Signed URLs (acesso temporário)
- Versionamento automático
- Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#6-setup-cloud-storage-bucket)

### Secret Manager

- Armazen seguro de senhas, chaves, credenciais
- Integração nativa com Cloud Run
- Auditoria de cada acesso
- Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#2-setup-secrets-em-secret-manager)

### HTTPS Load Balancer

- Distribui tráfego entre Frontend e Backend
- SSL/TLS termination
- Routing por path: `/` → Frontend, `/api/*` → Backend
- Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#7-conectar-frontend-e-backend-via-load-balancer)

---

## 📝 Exemplos de Uso

### Build & Deploy (1 comando)

```bash
./scripts/cloud-run-build.sh YOUR_PROJECT_ID us-central1 v1.0.0 your-domain.com
```

Ver: [scripts/cloud-run-build.sh](../../scripts/cloud-run-build.sh)

### Verificar Saúde

```bash
BACKEND_URL=$(gcloud run services describe terceirogestor-backend \
  --format='value(status.url)' --region us-central1)
curl $BACKEND_URL/health
```

Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#8-testar-deployment)

### Ver Logs em Tempo Real

```bash
gcloud run logs read terceirogestor-backend --region us-central1 --follow
```

Ver: [02-DEPLOYMENT.md](02-DEPLOYMENT.md#9-monitoramento--logs)

---

## 🆘 FAQ

**P: Onde começo?**  
R: Leia [README.md](README.md), depois execute [01-CHECKLIST.md](01-CHECKLIST.md)

**P: Quanto tempo leva?**  
R: Fase 1 já está completa (~4h). Fases 2-5 levam ~3 semanas.

**P: Preciso fazer tudo agora?**  
R: Não! Você pode pausar após qualquer Fase. Salve os valores em `.env.production.local`.

**P: Pode voltar atrás?**  
R: Sim! Ver seção "Cleanup" em [02-DEPLOYMENT.md](02-DEPLOYMENT.md#12-cleanup)

**P: Qual versão do Node/Python/etc?**  
R: Ver `package.json` (backend) e `package.json` (frontend)

---

## 🔗 Links Externos

**GCP Documentation**:

- [Cloud Run](https://cloud.google.com/run/docs)
- [Cloud SQL](https://cloud.google.com/sql/docs/mysql)
- [Cloud Storage](https://cloud.google.com/storage/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Load Balancing](https://cloud.google.com/load-balancing/docs)

**Terceiro Gestor Docs**:

- [Canonical Business Structure](../canonical-business-structure.md)
- [Web Client Standard](../canonical-web-client-standard.md)
- [Marco Zero 1.0](../marco-zero-1.0.md)

---

## ✅ Checklist Global

- [x] Fase 1: Docker + Env (COMPLETO)
- [ ] Fase 2: GCP Setup + Deploy
- [ ] Fase 3: HTTPS Load Balancer
- [ ] Fase 4: Refactor Uploads
- [ ] Fase 5: Monitoring + Performance

---

## 📧 Suporte

Se tiver dúvidas:

1. Buscar em "Erros Comuns" de cada documento
2. Ver logs: `gcloud run logs read SERVICE_NAME --limit 50`
3. Consultar documentação GCP oficial (links acima)

---

**Versão**: 1.0  
**Última atualização**: Abril 2026  
**Projeto**: Terceiro Gestor - GCP Migration
