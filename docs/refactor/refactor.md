Lista de Tarefas de Refatoração (Local)
Do mais simples para o mais complexo.

## ✅ FASE 1: Docker + Variáveis de Ambiente (COMPLETO)

[x] Isolamento de Containers: Criar Dockerfiles independentes para Front e Back.
✅ backend/Dockerfile - Health check adicionado, sem /app/uploads
✅ frontend/Dockerfile - Sem mudanças, já otimizado

[x] Orquestração: Ajustar o docker-compose.yml para rodar os serviços separadamente.
✅ docker-compose.yml - Já configurado com serviços isolados
✅ .env.example - Atualizado com variáveis GCP
✅ .env.production - Template novo para Cloud Run

[x] Troca de Motor (PostgreSQL): Trocar de MySQL para PostgreSQL
✅ docker-compose.yml - Removido MySQL, adicionado PostgreSQL 16
✅ backend/package.json - Removido mariadb, adicionado pg driver
✅ backend/prisma/schema.prisma - Provider alterado para postgresql
✅ .env.example - Variáveis POSTGRES\_\* adicionadas
✅ .env.production - Formato DATABASE_URL atualizado
✅ Backup service - Removido (PostgreSQL backups via pg_dump)
[ ] Habilitar versionamento
[ ] Configurar permissões

[ ] Deploy no Cloud Run
[ ] Fazer build das imagens
[ ] Criar secrets no Secret Manager
[ ] Deploy backend service
[ ] Deploy frontend service
[ ] Validar health endpoints

## 🔴 FASE 3: HTTPS Load Balancer + Domain

[ ] Conectar via HTTPS Load Balancer
[ ] Configurar routing: / → Frontend, /api/\* → Backend
[ ] Setup apex domain (terceirogestor.com.br)
[ ] SSL/TLS certificate

## 🟣 FASE 4: Abstração de Storage (Refactor Uploads)

[ ] Implementar CloudStorageService
[ ] Wrapper para @google-cloud/storage SDK
[ ] Métodos: upload(), download(), generateSignedUrl()

[ ] Refactor FilesController
[ ] Remover diskStorage multer
[ ] Usar CloudStorageService
[ ] Gerar signed URLs para acesso

[ ] Implementar lógica de Signed URLs para documentos sensíveis (RG/Saúde)
[ ] TTL curto (5 min) para health documents
[ ] TTL médio (30 min) para programs
[ ] TTL longo (1h) para avatars

[ ] Migração de dados
[ ] Script para migrar arquivos locais → Cloud Storage
[ ] Validação de integridade
[ ] Dry-run + execute

[ ] Testes
[ ] CloudStorageService.spec.ts
[ ] FilesController.spec.ts
[ ] E2E tests

## 🟡 FASE 5: Otimizações + Monitoring

[ ] Otimização NextJS: Configurar output: 'standalone' para reduzir tamanho da imagem
[ ] Performance monitoring
[ ] Alertas automáticos
[ ] Blue-green deployment strategy
