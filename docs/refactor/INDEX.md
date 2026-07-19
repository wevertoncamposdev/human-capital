# 📚 Índice de Documentação - Cloud Storage Refactor

Bem-vindo à documentação do refactor! Use este índice para navegar pelos documentos em ordem.

---

## 🎯 Por Onde Começar?

### Se você tem **5 minutos**:

👉 Leia: [README.md](README.md) - Quick Start Guide

### Se você tem **30 minutos**:

👉 Leia em ordem:

1. [README.md](README.md)
2. [00-cloud-storage-overview.md](00-cloud-storage-overview.md) - Seções 1-5

### Se você tem **2-3 horas** (completo):

👉 Leia tudo em ordem sequencial (veja próxima seção)

---

## 📖 Leitura Sequencial Completa

### 1️⃣ **README.md** ⏱️ 10 min

**O quê**: Visão geral executiva + quick start  
**Para quem**: Todos (mandatory)  
**Conteúdo**:

- O que é o refactor?
- Arquitetura em 2 minutos
- Estrutura de pastas
- Segurança com Signed URLs
- Próximos passos
- Dúvidas comuns

**Saiba quando terminar**: Você entende o fluxo upload → GCS → signed URL

---

### 2️⃣ **00-cloud-storage-overview.md** ⏱️ 20 min

**O quê**: Plano geral, motivação, riscos e mitigações  
**Para quem**: Tech leads, architects, stakeholders  
**Conteúdo**:

- Motivação (por que não deixar como está?)
- Arquitetura proposta
- Fluxo de upload (novo)
- Fluxo de download com Signed URLs
- Estratégia de TTL
- Variáveis de ambiente
- Dependências npm
- Terraform IaC (bucket setup)
- Plano em 4 fases
- Riscos & mitigações

**Saiba quando terminar**: Você aceita o plano e entende os riscos

---

### 3️⃣ **01-files-controller-refactor.md** ⏱️ 1-2 horas

**O quê**: Deep dive na implementação de código  
**Para quem**: Desenvolvedores (sem exceção)  
**Conteúdo**:

- Estrutura atual vs nova
- Novo layout de arquivos (src/core/files)
- FilesModule (atualizado)
- file-types.ts (constantes)
- CloudStorageService (wrapper do SDK GCS)
- FilesService (lógica de negócio)
- FilesController (refatorado com exemplos)
- Tratamento de erros
- Checklist de implementação

**Saiba quando terminar**: Você consegue codificar o refactor sozinho

**✏️ Próxima ação**: Implementar os arquivos neste documento

---

### 4️⃣ **02-data-migration.md** ⏱️ 1 hora

**O quê**: Como migrar dados do filesystem para Cloud Storage  
**Para quem**: DevOps, SRE, QA  
**Conteúdo**:

- Pre-migration checklist
- Script Node.js (migrate-uploads-to-gcs.js)
  - dry-run: simula migração
  - execute: faz upload de verdade
  - validate: verifica integridade
- Plano de execução em produção (6 fases)
- Rollback plan
- Comunicação com usuários
- SQL queries úteis
- Pós-migração (monitoramento)

**Saiba quando terminar**: Você consegue executar a migração sem medo

**✏️ Próxima ação**: Copiar script, adaptar variáveis, rodar em staging

---

### 5️⃣ **03-testing.md** ⏱️ 1-2 horas

**O quê**: Estratégia completa de testes  
**Para quem**: QA, Desenvolvedores  
**Conteúdo**:

- Escopo de testes (unitário, integração, e2e, performance)
- CloudStorageService.spec.ts (testes unitários completos)
- FilesService.spec.ts (testes unitários + mocks)
- FilesController.spec.ts (testes integração)
- E2E tests com Supertest (upload → download)
- Load tests (Artillery.io)
- Checklist de testes
- Coverage target: 80%+

**Saiba quando terminar**: Você consegue rodar testes localmente

**✏️ Próxima ação**: `npm test` no backend + validar coverage

---

### 6️⃣ **04-deployment.md** ⏱️ 1-2 horas

**O quê**: Como fazer deploy com zero downtime  
**Para quem**: DevOps, SRE, Tech leads, Oncall  
**Conteúdo**:

- Pre-deployment checklist (semana antes, dia antes, 2h antes)
- Blue-Green deployment strategy
  - BLUE = produção atual
  - GREEN = produção nova
- Passos de deployment (6 fases, cada uma com script bash)
- docker-compose.green.yml (stack paralelo)
- Smoke tests
- Traffic redirect
- Monitoramento contínuo
- Cleanup
- Rollback plan (2 cenários)
- Métricas a monitorar (dashboard)
- Comunicação com usuários (emails, Slack)
- Checklist final

**Saiba quando terminar**: Você consegue fazer deploy em produção com confiança

**✏️ Próxima ação**: Preparar scripts de deploy, treinar time

---

## 🗺️ Mapa Mental (Dependências)

```
README.md
    ↓ (entender visão geral)
    ↓
00-cloud-storage-overview.md
    ├─→ 01-files-controller-refactor.md (implementar código)
    │       ↓
    │   03-testing.md (validar código)
    │       ↓
    │   02-data-migration.md (migrar dados)
    │       ↓
    └─→ 04-deployment.md (deploy em produção)
```

---

## 📋 Checklist de Execução

### Fase 1: Planning (1 semana)

- [ ] Ler README.md
- [ ] Ler 00-cloud-storage-overview.md
- [ ] Aprovar plano com stakeholders
- [ ] Alocar recursos (devs, devops, qa)
- [ ] Preparar cronograma

### Fase 2: Development (3-4 dias)

- [ ] Ler 01-files-controller-refactor.md
- [ ] Setup GCP (bucket + service account)
- [ ] Implementar CloudStorageService
- [ ] Implementar FilesService
- [ ] Refatorar FilesController
- [ ] Commit & code review

### Fase 3: Testing (2-3 dias)

- [ ] Ler 03-testing.md
- [ ] Escrever testes unitários
- [ ] Escrever testes integração
- [ ] E2E tests em staging
- [ ] Performance tests
- [ ] Coverage > 80%

### Fase 4: Migration & Deployment (1 semana)

- [ ] Ler 02-data-migration.md
- [ ] Dry-run em staging
- [ ] Ler 04-deployment.md
- [ ] Preparar docker-compose.green.yml
- [ ] Preparar scripts de deployment
- [ ] Smoke tests validados
- [ ] Manutenção: executar migração
- [ ] Blue-green deployment
- [ ] Monitoramento 1 semana

---

## 🔗 Links Diretos por Tópico

### Tenho Dúvida Sobre...

**... o quê é um Signed URL?**
→ [README.md#🔐-segurança-signed-urls](README.md#-segurança-signed-urls)

**... como implementar CloudStorageService?**
→ [01-files-controller-refactor.md#33-arquivo-cloud-storageservicets-novo](01-files-controller-refactor.md)

**... como migrar dados de verdade?**
→ [02-data-migration.md#3-script-de-migração](02-data-migration.md)

**... como escrever testes?**
→ [03-testing.md#31-cloudstorageservice-tests](03-testing.md)

**... como fazer deploy sem downtime?**
→ [04-deployment.md#2-estratégia-de-deployment-blue-green](04-deployment.md)

**... o que é blue-green deployment?**
→ [04-deployment.md#1-pré-deployment-checklist](04-deployment.md)

---

## 📊 Status de Implementação

| Fase        | Status       | Doc | Ação            |
| ----------- | ------------ | --- | --------------- |
| Planning    | ✅ Completo  | 00  | N/A             |
| Development | 📝 Planejado | 01  | Implementar     |
| Testing     | 📝 Planejado | 03  | Escrever testes |
| Migration   | 📝 Planejado | 02  | Migrar dados    |
| Deployment  | 📝 Planejado | 04  | Deploy em prod  |

---

## 🎓 Treinamento por Função

### Desenvolvedor

**Leia**: README → 00 → 01 → 03 → 02 (opcional)  
**Tempo**: 5-7 horas  
**Aprenda**: Implementar o refactor completo

### QA / Tester

**Leia**: README → 00 → 03 → 02 (test execution part)  
**Tempo**: 4-5 horas  
**Aprenda**: Testar upload/download, validar integridade

### DevOps / SRE

**Leia**: README → 00 → 02 → 04  
**Tempo**: 5-6 horas  
**Aprenda**: Migrar dados, fazer deploy, troubleshoot

### Tech Lead / Architect

**Leia**: Tudo (na ordem acima)  
**Tempo**: 8-10 horas  
**Aprenda**: Planejar, validar, aprovar, comunicar

---

## 🚨 Documentos Críticos (Não Pule!)

1. **README.md** - Se pular isso, não entende a visão geral
2. **01-files-controller-refactor.md** - Se pular isso, implementação será incompleta
3. **04-deployment.md** - Se pular isso, pode quebrar production

---

## 🔄 Atualizações & Versioning

**Versão**: 1.0  
**Data**: Abril 2026  
**Status**: 📝 Planejamento

Se encontrar erros ou tiver sugestões:

1. Crie issue no projeto
2. Submeta PR com correção
3. Atualize este índice

---

## 📞 Suporte

- **Dúvidas técnicas**: Abra issue no repo
- **Dúvidas de negócio**: Fale com PO
- **Problemas de deployment**: Escalate para tech lead

---

**Próxima ação**: 👉 [Comece pelo README.md](README.md)

Boa sorte! 🚀
