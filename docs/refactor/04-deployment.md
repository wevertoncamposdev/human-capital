# Deployment & Cutover Strategy

**Objetivo**: Planejar e documentar o deploy em produção com zero downtime (blue-green deployment).

---

## 1. Pré-Deployment Checklist

### Semana Antes

- [ ] Validar todos os testes passam (unit, integration, e2e)
- [ ] Code review completo do refactor
- [ ] Staging deployment bem-sucedido (mínimo 1 semana rodando)
- [ ] Performance test validado (< 500ms p95)
- [ ] Backup completo do banco
- [ ] Backup completo de `/app/uploads` → GCS
- [ ] Runbook pronto para oncall
- [ ] Comunicado enviado para usuários

### Dia Anterior

- [ ] Criar snapshot de DB (Cloud SQL point-in-time recovery)
- [ ] Validar service account GCP tem permissões
- [ ] Preparar rollback plan
- [ ] Time de suporte avisado
- [ ] Monitoramento configurado (alertas para erros)

### 2h Antes

- [ ] Comunicado final aos usuários: "manutenção em 2h"
- [ ] Parar novos uploads (feature flag)
- [ ] Coletar métricas baseline(upload rate, P95, erros)
- [ ] Testar HTTPS Load Balancer (se primeiro deploy)

---

## 2. Estratégia de Deployment: Blue-Green

### Explicação Rápida

```
BLUE (Produção Atual)          GREEN (Produção Nova)
├─ Backend:3001  ←────────→    ├─ Backend:3001
├─ Frontend:3000              ├─ Frontend:3000
├─ Uses filesystem            ├─ Uses Cloud Storage
└─ Running                     └─ Not running yet

Passo 1: Preparar GREEN com novo código
Passo 2: Testar GREEN independente
Passo 3: Redirecionar tráfego BLUE → GREEN
Passo 4: Monitorar GREEN por 1h
Passo 5: Retire BLUE (ou mantenha como fallback por 24h)
```

---

## 3. Passos de Deployment (Produção)

### Phase 1: Preparação (T-30 min)

```bash
#!/bin/bash
set -e

echo "[T-30] Phase 1: Preparação"

# 1. Fazer checkout do novo código
cd /app
git checkout cloud-storage-refactor
git pull origin cloud-storage-refactor

# 2. Build das imagens Docker (em paralelo)
docker build -t terceirogestor-backend:green ./backend &
docker build -t terceirogestor-frontend:green ./frontend &
wait

echo "✓ Imagens built successfully"

# 3. Listar imagens built
docker images terceirogestor-*:green
```

---

### Phase 2: Deploy GREEN (T-20 min)

```bash
#!/bin/bash
set -e

echo "[T-20] Phase 2: Deploy GREEN stack"

# 1. Spinar novo stack (GREEN) em paralelo com BLUE
docker-compose -f docker-compose.green.yml up -d

# 2. Esperar health checks passarem
echo "Aguardando health checks..."
for i in {1..30}; do
  if curl -f http://localhost:3001/health && \
     curl -f http://localhost:3000/health; then
    echo "✓ Health checks OK"
    break
  fi
  echo "  Tentativa $i/30..."
  sleep 2
done

echo "✓ GREEN stack running"
```

**Arquivo**: `docker-compose.green.yml` (novo)

```yaml
version: "3.8"

services:
  mysql-green:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - mysql_data_green:/var/lib/mysql
    ports:
      - "3308:3306" # Porta diferente de BLUE
    healthcheck:
      test: ["CMD-SHELL", "mysqldump ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend-green:
    image: terceirogestor-backend:green
    restart: unless-stopped
    depends_on:
      mysql-green:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: "3002" # Porta diferente de BLUE :3001
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@mysql-green:3306/${MYSQL_DATABASE}
      GCP_PROJECT_ID: ${GCP_PROJECT_ID}
      GCP_BUCKET_NAME: ${GCP_BUCKET_NAME}
      JWT_SECRET: ${JWT_SECRET}
      # ... outras variáveis
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3002/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3

  frontend-green:
    image: terceirogestor-frontend:green
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3001"
      NEXT_PUBLIC_API_URL: "http://localhost/api"
      API_INTERNAL_URL: "http://backend-green:3002"
    ports:
      - "3001:3001" # Porta diferente de BLUE :3000
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3001/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3

volumes:
  mysql_data_green:
```

**Notas**:

- Portas diferentes (3001/3002) para rodar em paralelo
- Banco separado temporário (ou compartilhado se usar read replica)
- Frontend aponta internamente para backend-green

---

### Phase 3: Smoke Tests (T-10 min)

```bash
#!/bin/bash
set -e

echo "[T-10] Phase 3: Smoke Tests no GREEN"

BASE_URL="http://localhost:3001"

# 1. Health check
echo "Testing health..."
curl -f $BASE_URL/health || exit 1

# 2. Login simples
echo "Testing login..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}')

if echo "$RESPONSE" | grep -q "token"; then
  echo "✓ Login working"
else
  echo "✗ Login failed"
  echo "$RESPONSE"
  exit 1
fi

# 3. Test upload (health document)
echo "Testing file upload..."
TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
UPLOAD=$(curl -s -X POST $BASE_URL/api/files/health-documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "personId=person-123")

if echo "$UPLOAD" | grep -q "id"; then
  ATTACHMENT_ID=$(echo "$UPLOAD" | jq -r '.id')
  echo "✓ Upload working (attachment: $ATTACHMENT_ID)"

  # 4. Test signed URL generation
  echo "Testing signed URL..."
  URL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/files/$ATTACHMENT_ID" \
    -H "Authorization: Bearer $TOKEN")

  if echo "$URL_RESPONSE" | grep -q "signedUrl"; then
    echo "✓ Signed URL generation working"
  else
    echo "✗ Signed URL failed"
    echo "$URL_RESPONSE"
    exit 1
  fi
else
  echo "✗ Upload failed"
  echo "$UPLOAD"
  exit 1
fi

echo ""
echo "✓ All smoke tests passed!"
```

---

### Phase 4: Redirect Traffic (T-0 min)

```bash
#!/bin/bash
set -e

echo "[T-0] Phase 4: Redirect Traffic BLUE → GREEN"

# 1. Atualizar Load Balancer (assumindo HTTPS Load Balancer do GCP)
#    Nota: Manual via Console ou via Terraform/gcloud CLI
echo "Atualizando Load Balancer..."
gcloud compute backend-services update backend-service-api \
  --global \
  --enable-cdn \
  --instance-group=instance-group-api-green \
  --instance-group-zone=us-central1-a

# OU se usar docker-compose + nginx local:
# Atualizar nginx para apontar para :3002 em vez de :3001
sed -i 's/backend:3001/backend-green:3002/g' /app/docker/nginx/default.conf
docker-compose exec nginx nginx -s reload

echo "✓ Traffic redirected to GREEN"

# 2. Monitorar por 10 minutos
echo "Monitorando por 10 minutos..."
for i in {1..60}; do
  ERRORS=$(docker-compose logs backend-green | grep -i error | wc -l)
  if [ $ERRORS -gt 0 ]; then
    echo "⚠️  Errors detected! Rollback iniciado..."
    bash /app/scripts/rollback.sh
    exit 1
  fi
  sleep 10
  echo "  [$((i*10))s] OK"
done

echo "✓ GREEN stable for 10 minutes"
```

---

### Phase 5: Monitoramento (T+0 até T+1h)

```bash
#!/bin/bash

echo "[T+0] Phase 5: Monitoramento Contínuo"

# 1. Logs em tempo real (backend)
docker-compose logs -f backend-green | grep -E "ERROR|WARN|Exception" &
LOG_PID=$!

# 2. Métricas de aplicação
watch -n 5 "
  echo 'Backend Status:' && \
  curl -s http://localhost:3002/metrics | grep -E 'http_request_duration|nodejs_' && \
  echo '' && \
  echo 'Cloud Storage Operations:' && \
  gsutil stat gs://terceirogestor/*/*/
"

# 3. Alertas automáticos
curl -X POST https://hooks.slack.com/services/... \
  -d '{
    "text": "✅ GREEN deployment successful",
    "blocks": [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Deployment Status*\nStack: GREEN\nTime: T+0\nStatus: Monitoring..."
      }
    }]
  }'
```

---

### Phase 6: Cleanup BLUE (T+1h)

**Apenas se GREEN está 100% estável**

```bash
#!/bin/bash
set -e

echo "[T+1h] Phase 6: Cleanup BLUE"

# 1. Parar BLUE (ou manter como fallback por 24h)
docker-compose -f docker-compose.yml down
# OU apenas pause:
# docker-compose pause

# 2. Manter storage (não deletar uploads locais ainda)
tar czf backups/blue-uploads-$(date +%Y%m%d-%H%M%S).tar.gz /app/uploads
# ... aguardar 7 dias antes de deletar

# 3. Renomear volumes
docker volume mv terceirogestor_mysql_data terceirogestor_mysql_data_blue_$(date +%Y%m%d)
docker volume mv terceirogestor_mysql_data_green terceirogestor_mysql_data

echo "✓ BLUE cleanup complete"
```

---

## 4. Rollback Plan (Se algo der Errado)

### Cenário 1: Error Durante Deploy (Antes de Switchover)

```bash
#!/bin/bash

echo "❌ ROLLBACK: Green deployment falhou da smoke tests"

# Apenas parar GREEN, manter BLUE rodando
docker-compose -f docker-compose.green.yml down

# Notificar
curl -X POST https://hooks.slack.com/services/... \
  -d '{"text": "❌ GREEN deployment failed. BLUE still running. Investigation needed."}'

exit 1
```

### Cenário 2: Error Pós-Switchover (Traffic já em GREEN)

```bash
#!/bin/bash
set -e

echo "❌ ROLLBACK: Errors detected in GREEN. Reverting traffic..."

# 1. Redirecionar tráfego de volta para BLUE
gcloud compute backend-services update backend-service-api \
  --global \
  --instance-group=instance-group-api-blue \
  --instance-group-zone=us-central1-a

echo "✓ Traffic reverted to BLUE"

# 2. Coletar logs do GREEN para debug
docker-compose -f docker-compose.green.yml logs > logs/green-failure-$(date +%Y%m%d-%H%M%S).log

# 3. Parar GREEN
docker-compose -f docker-compose.green.yml down

# 4. Restaurar banco se necessário
#    (Usar Cloud SQL point-in-time recovery)
gcloud sql backups restore BACKUP_ID \
  --backup-instance=terceirogestor-prod \
  --backup-configuration=BACKUP_CONFIG

echo "✓ Rollback complete. Investigating cause..."
```

---

## 5. Monitoramento Pós-Deploy

### Alertas Críticos (1a Semana)

```yaml
# Exemplo: Prometheus/Grafana alert rules
- alert: FileUploadFailures
  expr: rate(files_upload_errors_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "High file upload errors"

- alert: SignedURLGenerationSlow
  expr: histogram_quantile(0.95, http_request_duration_seconds{endpoint="/files/download"}) > 1
  for: 5m
  annotations:
    summary: "Signed URL generation > 1s"

- alert: GCSQuotaExceeded
  expr: gcs_objects_count > 1000000 OR gcs_storage_bytes > 1TB
  for: 1m
  annotations:
    summary: "Cloud Storage quota warning"

- alert: AuthFailuresUp
  expr: rate(auth_failures_total[5m]) > 0.05
  for: 2m
  annotations:
    summary: "Auth failures increasing"
```

### Métricas a Monitorar (Dashboard)

```
1. Upload Success Rate (target: > 99.5%)
2. Download Latency P95 (target: < 500ms)
3. Signed URL Generation Latency (target: < 100ms)
4. Cloud Storage API Errors (target: 0)
5. Database Connection Pool (target: < 80% utilization)
6. Memory Usage (target: < 500MB)
7. Disk I/O (target: 0 - tudo via GCS)
```

---

## 6. Comunicação com Usuários

### Notificação Pré-Manutenção (48h antes)

```
📧 Assunto: [Manutenção Planejada] Otimização de Sistema

Prezados usuários,

Realizaremos uma manutenção em YYYY-MM-DD às HHh (São Paulo).

⏱️ Duração: ~2 horas
📌 Impacto: Sistema indisponível durante manutenção
📁 Uploads: Não será possível fazer upload/download de arquivos

Motivo: Otimização de infraestrutura para melhor performance

Agradecer sua paciência!
Equipe Técnica
```

### Comunicação Durante Manutenção

```
💬 Slack: "#status"
"Manutenção iniciada. Esperado conclusão em 2 horas."
"[T+30min] 50% do deployment completo. Smoke tests rodando..."
"[T+60min] Redirecionando tráfego para novo stack..."
"[T+90min] ✅ Sistema online. Monitorando..."
```

### Notificação Pós-Manutenção

```
✅ Manutenção concluída com sucesso!

Melhorias implementadas:
- Upload de arquivos now 40% mais rápido
- Zero downtime entre deploys (blue-green strategy)
- Melhor segurança com signed URLs
- Escalabilidade automática via Cloud Storage

Obrigado!
```

---

## 7. Checklist de Deployment

- [ ] Todos os testes passam (unit, integration, e2e)
- [ ] Code review aprovado
- [ ] Staging validation OK (1 semana)
- [ ] Backup banco completo
- [ ] Backup uploads completo
- [ ] Métricas baseline coletadas
- [ ] Runbook pronto
- [ ] Comunicado enviado aos usuários
- [ ] Load Balancer testado
- [ ] Smoke tests preparados
- [ ] Rollback plan documentado
- [ ] Monitoramento configurado
- [ ] Team pronto
- [ ] Docker images built e testadas
- [ ] Database migrations validadas

## 8. Pós-Deployment (Semanas 1-4)

- [ ] Verificar 0 erros de "arquivo não encontrado"
- [ ] GCS costs dentro do orçado (< $500/mês est.)
- [ ] Performance stays stable (P95 < 500ms)
- [ ] Documentar lições aprendidas
- [ ] Treinamento para team em novo fluxo
- [ ] Atualizar runbook da operação

---

## 9. Referências

- [Blue-Green Deployment Pattern](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
- [Google Cloud Load Balancing](https://cloud.google.com/load-balancing)
- [Production Readiness Review](https://cloud.google.com/docs/best-practices)
