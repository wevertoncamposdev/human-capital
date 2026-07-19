# `src/features/*` (legado / transição)

Este diretório existe por motivos históricos. O objetivo do template é que **toda funcionalidade de domínio** fique dentro de um módulo em `src/modules/<moduleKey>`.

## Regra

- **Domínio de produto** → `src/modules/<moduleKey>/...`
- **Infra cross-module** (ex.: auth, uploads) → pode ficar em `src/features/*` por enquanto

## Permitido aqui

- `auth/*` (AuthProvider, current-user, login/logout)
- `uploads/*` (upload genérico)

## Não permitido aqui (no template final)

Qualquer feature que seja subdomínio de um módulo. Ex.: features do módulo `people` devem viver em `src/modules/people/features/*`.


Se você encontrar uma pasta de domínio aqui, trate como:
1) “legado a migrar”
2) mover para o módulo correto quando o módulo existir
