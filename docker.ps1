param(
    [ValidateSet('up', 'down', 'build', 'restart', 'logs', 'ps')]
    [string]$Command = 'up',

    [ValidateSet('full', 'dev')]
    [string]$Environment = 'full',

    [ValidateSet('all', 'database', 'backend', 'frontend')]
    [string]$Service = 'all',

    [switch]$Build
)

$ErrorActionPreference = 'Stop'

function Invoke-DockerCompose {
    param(
        [string]$ComposeFile,
        [string[]]$Arguments
    )

    & docker compose -f $ComposeFile @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: -f $ComposeFile $($Arguments -join ' ')"
    }
}

function Test-Docker {
    & docker version *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker is not available. Start Docker Desktop and try again.'
    }
}

function Resolve-Services {
    param(
        [string]$SelectedService,
        [string]$SelectedEnvironment
    )

    if ($SelectedEnvironment -eq 'dev') {
        if ($SelectedService -eq 'all' -or $SelectedService -eq 'database') {
            return @('postgres')
        }

        throw "In dev environment, only 'all' and 'database' are valid services."
    }

    if ($SelectedService -eq 'all') {
        return @()
    }

    if ($SelectedService -eq 'database') {
        return @('postgres')
    }

    return @($SelectedService)
}

Test-Docker

$composeFile = if ($Environment -eq 'dev') { './docker/compose.dev.yml' } else { './docker/compose.full.yml' }
$targetServices = Resolve-Services -SelectedService $Service -SelectedEnvironment $Environment

switch ($Command) {
    'up' {
        $args = @('up', '-d', '--remove-orphans')
        if ($Build) {
            $args += '--build'
        }
        $args += $targetServices
        Invoke-DockerCompose -ComposeFile $composeFile -Arguments $args

        if ($Environment -eq 'dev') {
            Write-Host 'Database: localhost:5432'
            Write-Host 'Backend (local):  cd backend; npm run start:dev'
            Write-Host 'Frontend (local): cd frontend; npm run dev'
        }
        else {
            Write-Host 'Frontend: http://localhost:3000'
            Write-Host 'Backend:  http://localhost:3001'
            Write-Host 'Database: localhost:5432'
        }
    }

    'down' {
        Invoke-DockerCompose -ComposeFile $composeFile -Arguments @('down', '--remove-orphans')
    }

    'build' {
        $args = @('build') + $targetServices
        Invoke-DockerCompose -ComposeFile $composeFile -Arguments $args
    }

    'restart' {
        if ($targetServices.Count -eq 0) {
            Invoke-DockerCompose -ComposeFile $composeFile -Arguments @('restart')
        }
        else {
            Invoke-DockerCompose -ComposeFile $composeFile -Arguments (@('restart') + $targetServices)
        }
    }

    'logs' {
        if ($targetServices.Count -eq 0) {
            Invoke-DockerCompose -ComposeFile $composeFile -Arguments @('logs', '-f')
        }
        else {
            Invoke-DockerCompose -ComposeFile $composeFile -Arguments (@('logs', '-f') + $targetServices)
        }
    }

    'ps' {
        Invoke-DockerCompose -ComposeFile $composeFile -Arguments @('ps')
    }
}