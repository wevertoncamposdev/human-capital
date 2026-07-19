# Terceiro Gestor t

Este projeto foi reorganizado para rodar direto no Docker, com acesso unico pela URL definida em `WEB_URL`, persistencia de dados, backup automatico e atualizacao simplificada por PowerShell.

Toda a configuracao do projeto agora fica centralizada no `.env` da raiz. Isso vale para Docker e tambem para execucao local de backend/frontend.

## Como ficou

- acesso publico so pela URL configurada em `WEB_URL` na porta `80`
- `mysql` e `uploads` persistidos em volumes Docker
- backup automatico do banco e dos uploads
- backup manual com um comando
- atualizacao com `git pull`, rebuild, migracao e recriacao da stack sem apagar dados
- uma documentacao operacional unica neste `README.md`

## Pre-requisitos

- Docker Desktop em execucao
- PowerShell
- Git

## Arquivos importantes

- `docker/compose.full.yml`: ambiente completo em Docker (database + backend + frontend)
- `docker/compose.dev.yml`: ambiente de desenvolvimento com somente database
- `.env.example`: modelo unico de configuracao local
- `docker.ps1`: operacao de ambientes Docker
- `infra/scripts/gcp`: scripts de deploy e manutencao GCP (uso local, fora do Git)

## Primeira subida

1. Criar o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

2. Editar o minimo necessario em `.env`:

- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `DATABASE_URL` se for rodar backend fora do Docker
- `MYSQL_BIND_ADDRESS` e `MYSQL_HOST_PORT` se quiser acessar o MySQL pela maquina host
- `TOTP_ENCRYPTION_KEY` e `PII_MASTER_KEY` se quiser deixar a seguranca pronta desde o inicio
- `BACKUP_PATH` se quiser salvar backups fora do repositorio

3. Subir o ambiente completo em Docker:

```powershell
.\docker.ps1 up -Environment full
```

O script valida automaticamente:

- se o Docker Desktop esta em execucao
- se `.env` tem as chaves minimas obrigatorias
- se algum valor com `$` foi deixado sem aspas simples

4. Ajustar a URL publica no `.env`:

- em maquina local: `WEB_URL=http://localhost`
- em servidor/LAN: `WEB_URL=http://192.168.1.250` ou seu dominio

5. Acessar:

```text
URL definida em WEB_URL
```

Opcao para desenvolvimento com hot reload (somente banco em Docker):

```powershell
.\docker.ps1 up -Environment dev
cd backend; npm run start:dev
cd ../frontend; npm run dev
```

Importante:

- o seed de demonstracao nao roda por padrao
- `backend/.env` e `frontend/.env` nao sao mais necessarios
- `localhost:3000` e `localhost:3001` nao sao mais o caminho oficial de acesso
- para acesso por IP ou dominio, ajuste `WEB_URL` e os callbacks OAuth no `.env`

## Onde os dados ficam

- banco: volume Docker `terceirogestor_mysql_data`
- uploads: volume Docker `terceirogestor_uploads_data`
- backups: pasta definida em `BACKUP_PATH`

Padrao de backup:

```text
storage/backups
```

Isso significa:

- `docker compose down` para os containers, mas nao apaga dados
- `docker compose down -v` apaga os volumes e deve ser evitado
- `git pull` e rebuild nao apagam banco nem uploads

## Operacao do dia a dia

Subir ou religar a stack completa:

```powershell
.\docker.ps1 up -Environment full
```

Subir somente database para desenvolvimento local:

```powershell
.\docker.ps1 up -Environment dev
```

Ver status:

```powershell
docker compose ps
```

Ver logs:

```powershell
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f backup
```

Parar a stack:

```powershell
docker compose down
```

## Backup

O servico `backup` roda automaticamente em cron e salva:

- dump do MySQL
- arquivo compactado dos uploads

Configuracoes no `.env`:

- `BACKUP_SCHEDULE`: horario do backup
- `BACKUP_KEEP_DAYS`: quantos dias manter
- `BACKUP_PATH`: onde salvar
- `TZ`: fuso horario do cron e dos nomes dos arquivos

Exemplo padrao:

```text
BACKUP_SCHEDULE=0 3 * * *
BACKUP_KEEP_DAYS=14
TZ=America/Sao_Paulo
```

## Acesso ao MySQL

O servico `mysql` pode ser acessado pela maquina host com estas variaveis no `.env`:

- `MYSQL_BIND_ADDRESS`: IP de bind da porta publicada. Padrao seguro: `127.0.0.1`
- `MYSQL_HOST_PORT`: porta publicada no host. Padrao: `3307`

Exemplo padrao para testes locais:

```text
MYSQL_BIND_ADDRESS=127.0.0.1
MYSQL_HOST_PORT=3307
```

String de conexao a partir do host:

```text
mysql://root:SUA_SENHA@127.0.0.1:3307/terceirogestor?allowPublicKeyRetrieval=true&ssl=false
```

Se precisar acessar de outra maquina da rede, troque por algo como:

```text
MYSQL_BIND_ADDRESS=0.0.0.0
MYSQL_HOST_PORT=3306
```

Atencao:

- isso expõe o banco para a rede e deve ser combinado com firewall ou rede privada
- se ja existir outro MySQL usando a mesma porta no host, altere `MYSQL_HOST_PORT`
- depois de mudar o `.env`, reaplique a stack com `.\script\up.ps1`

Para operacoes de backup/restore legadas, use os scripts movidos para `docker/scripts`.

## Atualizacao do projeto

Atualize o codigo com Git e reaplique o ambiente Docker:

```powershell
git pull --ff-only
.\docker.ps1 up -Environment full -Build
```

Fluxo recomendado:

1. garantir backup de seguranca
2. executar `git pull --ff-only`
3. rebuildar imagens com `.\docker.ps1 up -Environment full -Build`
4. validar migrations/backfills conforme necessidade

Use seeds destrutivos somente em ambiente de desenvolvimento controlado.

## Restauracao

Scripts legados de restore estao em `docker/scripts`.

```powershell
.\script\restore.ps1
```

Restaurar somente uploads usando o ultimo backup:

```powershell
.\script\restore.ps1 -DatabaseBackup "--skip" -UploadsBackup "--latest"
```

Restaurar arquivos especificos:

```powershell
.\script\restore.ps1 -DatabaseBackup "C:\server\system_development\storage\backups\terceirogestor-db-20260401-030000.sql.gz"
.\script\restore.ps1 -DatabaseBackup "--skip" -UploadsBackup "C:\server\system_development\storage\backups\terceirogestor-uploads-20260401-030000.tar.gz"
```

Atencao:

- restaurar uploads substitui o conteudo atual do volume de uploads
- restaure primeiro em homologacao se estiver em duvida

## Variaveis principais do `.env`

- `MYSQL_ROOT_PASSWORD`: senha do MySQL
- `MYSQL_DATABASE`: nome do banco
- `JWT_SECRET`: segredo principal da aplicacao
- `WEB_URL`: URL externa do sistema. Exemplo local: `http://localhost`. Exemplo LAN: `http://192.168.1.250`
- `NEXT_PUBLIC_API_URL`: mantenha `/api`
- `GOOGLE_OAUTH_REDIRECT_URI`: callback publica do Google
- `MICROSOFT_OAUTH_REDIRECT_URI`: callback publica da Microsoft

Observacao importante:

- use apenas caracteres seguros para URL em `MYSQL_ROOT_PASSWORD` como letras, numeros, ponto, underscore e hifen
- se algum segredo tiver `$`, use aspas simples no `.env` da raiz para o Docker Compose nao interpretar isso como variavel

## Problemas comuns

Se o PowerShell bloquear execucao de script:

```powershell
powershell -ExecutionPolicy Bypass -File .\script\up.ps1
```

Se o script reclamar que o Docker nao esta pronto:

- abra o Docker Desktop
- espere o status ficar como ativo
- rode o comando novamente

Se quiser recriar tudo sem perder dados:

```powershell
.\script\up.ps1
```

Se algo falhar depois de uma atualizacao:

1. confira os logs com `docker compose logs -f`
2. use o backup gerado pelo `update.ps1`
3. rode `.\script\restore.ps1` se precisar voltar o banco

## Fluxo recomendado

1. editar codigo
2. fazer commit e push
3. no servidor ou maquina principal, rodar `.\script\update.ps1`
4. acessar a URL configurada em `WEB_URL`
