# Docker

Este projeto possui dois ambientes Docker oficiais:

- Full: sobe postgres, backend e frontend em containers.
- Dev: sobe somente postgres em container para desenvolvimento local com hot reload.

## Estrutura

- `docker/compose.full.yml`: ambiente completo em Docker
- `docker/compose.dev.yml`: ambiente de desenvolvimento com somente database
- `docker.ps1`: script operacional para ambos os ambientes
- `backend/Dockerfile`: imagem do backend (tambem usada no GCP)
- `frontend/Dockerfile`: imagem do frontend (tambem usada no GCP)

## Comandos rapidos

Ambiente full:

```powershell
.\docker.ps1 up -Environment full
.\docker.ps1 down -Environment full
.\docker.ps1 logs -Environment full -Service backend
```

Ambiente dev (somente DB):

```powershell
.\docker.ps1 up -Environment dev
.\docker.ps1 ps -Environment dev
.\docker.ps1 down -Environment dev
```

Depois de subir o ambiente dev, rode localmente:

```powershell
cd backend
npm run start:dev

cd ..\frontend
npm run dev
```

## Portas padrao

- frontend (full): `http://localhost:3000`
- backend (full): `http://localhost:3001`
- postgres (full/dev): `localhost:5432`

## Relacao com GCP

- Os Dockerfiles de backend e frontend permanecem compativeis com Cloud Run.
- Scripts de GCP ficam em `infra/scripts/gcp` e nao fazem parte da operacao Docker local.
