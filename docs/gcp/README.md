# 📚 Guia Completo: Migração para Google Cloud Run

Bem-vindo ao guia de migração do **Terceiro Gestor** para Google Cloud Platform!

---

## 🎯 Objetivo

Migrar aplicação de `docker-compose` local para **Cloud Run** com:

- ✅ Docker images otimizadas
- ✅ Variáveis de ambiente documentadas
- ✅ Cloud SQL para database
- ✅ Cloud Storage para uploads
- ✅ HTTPS Load Balancer com domínio customizado

---

## 📖 Como Usar Este Guia

### 1️⃣ **Começar aqui**: [00-PRONTO.md](00-PRONTO.md)

Resumo do que foi preparado e o status atual.

### 2️⃣ **Checklist prática**: [01-CHECKLIST.md](01-CHECKLIST.md)

6 fases à executar, cada uma com suas tarefas específicas.

### 3️⃣ **Guia técnico detalhado**: [02-DEPLOYMENT.md](02-DEPLOYMENT.md)

Todos os comandos e explicações para fazer build, deploy e configurar GCP.

---

## 🚀 Quick Start (5 min)

```bash
# 1. Setup gcloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Habilitar APIs
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  storage-component.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com

# 3. Build images
gcloud builds submit backend --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest
gcloud builds submit frontend --tag gcr.io/YOUR_PROJECT_ID/terceirogestor-frontend:latest

# 4. Deploy (ver 02-DEPLOYMENT.md para comando completo)
gcloud run deploy terceirogestor-backend \
  --image gcr.io/YOUR_PROJECT_ID/terceirogestor-backend:latest \
  --region us-central1 \
  --memory 512Mi \
  ...
```

---

## 📊 Timeline

| Fase  | Tarefa                              | Tempo | Status      |
| ----- | ----------------------------------- | ----- | ----------- |
| **1** | Docker + Env                        | 4-5h  | ✅ Completo |
| **2** | GCP Setup (SQL, Storage, Secrets)   | 1-2h  | ⏳ Próxima  |
| **3** | HTTPS Load Balancer + Domain        | 3h    | ⏳ Depois   |
| **4** | Refactor Uploads para Cloud Storage | 1-2w  | ⏳ Fase 4   |
| **5** | Performance + Monitoring            | 1w    | ⏳ Contínuo |

**Total MVP**: ~2-3 semanas

---

## 🔗 Estrutura dos Arquivos

```
/docs/gcp/
├── README.md                     ← Você está aqui
├── 00-PRONTO.md                  ← O que foi preparado
├── 01-CHECKLIST.md               ← Tarefas à executar (6 fases)
└── 02-DEPLOYMENT.md              ← Guia técnico completo (12 seções)
```

---

## 🎓 Conceitos-Chave

### Cloud Run

- Serverless container orchestration
- Pay-per-use (free tier: 2M requests/mês)
- Auto-scaling baseado em demanda
- HTTPS + domain automático

### Cloud SQL

- Managed MySQL database
- Backups automáticos
- High availability (replicação)
- Conexão via Cloud SQL Proxy

### Cloud Storage

- Bucket privado para uploads
- Signed URLs (acesso temporário)
- Versionlog automático
- Replicação geo-redundante

### Secret Manager

- Armazena senhas, chaves, credenciais
- Integração com Cloud Run
- Auditoria de acesso
- Rotação automática de versões

---

## 🤔 FAQ Rápido

**P: Por que não refactorar tudo agora?**  
R: Abordagem "simple-to-complex": primeiro deixa rodar no Cloud Run sem mudanças de código, depois refactora uploads quando Cloud Storage estiver pronto.

**P: Preciso fazer tudo em uma sessão?**  
R: Não! Você pode pausar após qualquer fase. Guarda os valores de PROJECT_ID, CONNECTION_NAME, BUCKET_NAME em arquivo `.env.production.local`.

**P: E se algo der errado?**  
R: Ver seção "Troubleshooting" em [02-DEPLOYMENT.md](02-DEPLOYMENT.md#11-troubleshooting).

**P: Quanto custa?**  
R: Free tier cobre maioria dos casos. Depois: ~$0.40/1M requests (Cloud Run) + ~$10/mês (Cloud SQL micro) + ~$0.020/GB (Cloud Storage).

---

## ✅ Checklist de Decisão

Antes de começar, você deve ter:

- [ ] Projeto GCP criado ([https://console.cloud.google.com](https://console.cloud.google.com))
- [ ] gcloud CLI instalado (`gcloud --version`)
- [ ] Autenticado (`gcloud auth login`)
- [ ] Docker instalado (`docker --version`)
- [ ] Domínio customizado (opcional, para Fase 3)
- [ ] EMAIL para notificações (opcional)

---

## 🎬 Próxima Ação

1. Ler [00-PRONTO.md](00-PRONTO.md) - 5 min
2. Ler [01-CHECKLIST.md](01-CHECKLIST.md) - 10 min
3. Começar Fase 1 (Local Setup) da checklist

---

## 📞 Suporte

Se tiver dúvidas:

1. Buscar na seção "Common Errors" de cada arquivo
2. Verificar logs: `gcloud run logs read SERVICE_NAME --region us-central1 --limit 50`
3. Consultar documentação oficial:
   - [Cloud Run Docs](https://cloud.google.com/run/docs)
   - [Cloud SQL Docs](https://cloud.google.com/sql/docs/mysql)
   - [Cloud Storage Docs](https://cloud.google.com/storage/docs)

---

**Versão**: 1.0  
**Última atualização**: Abril 2026  
**Projeto**: Terceiro Gestor - GCP Migration
