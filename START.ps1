#!/usr/bin/env pwsh

param(
    [ValidateSet('full', 'dev')]
    [string]$Environment = 'full'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Copy-Item '.env.example' '.env'
        Write-Host 'Arquivo .env criado a partir de .env.example.' -ForegroundColor Yellow
        Write-Host 'Edite POSTGRES_PASSWORD e JWT_SECRET antes de subir o ambiente.' -ForegroundColor Yellow
        exit 0
    }

    throw '.env.example nao encontrado na raiz do projeto.'
}

& '.\docker.ps1' up -Environment $Environment
