# ╔══════════════════════════════════════════════════════╗
# ║  LEADPRO NEURAL — Agendador de Backup Diário         ║
# ║  Execute este script como ADMINISTRADOR              ║
# ║  Clique com botão direito → Executar como admin     ║
# ╚══════════════════════════════════════════════════════╝

$TaskName    = "LeadPro-Backup-Diario"
$NodeExe     = "C:\Program Files\nodejs\node.exe"
$BackupScript= "C:\Users\Acer\Desktop\LeadPro\leadflow-pro\backup_sistema.cjs"
$LogDir      = "C:\Users\Acer\Desktop\LeadPro\leadflow-pro\backups\logs"
$WrapperCmd  = "C:\Users\Acer\Desktop\LeadPro\leadflow-pro\backups\executar_backup.cmd"

# Criar diretório de logs se não existir
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Remover tarefa antiga se existir
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "🗑  Tarefa antiga removida (se existia)." -ForegroundColor Yellow

# Definir ação
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$WrapperCmd`""

# Disparador: todo dia às 00:00
$Trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At "00:00"

# Configurações robustas
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 15) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -WakeToRun $false

# Registrar tarefa com usuário ATUAL (sem precisar de SYSTEM)
$CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Backup automatico diario do LeadPro Neural - Executa às 00:00" `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host ""
Write-Host "✅ Tarefa '$TaskName' registrada com sucesso!" -ForegroundColor Green
Write-Host "📅 Execução: Todo dia às 00:00" -ForegroundColor Cyan
Write-Host "📂 Logs: $LogDir" -ForegroundColor Cyan
Write-Host ""

# Verificar se foi criada
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Task) {
    $TaskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "✅ Verificado no Agendador!" -ForegroundColor Green
    Write-Host "   Próxima execução: $($TaskInfo.NextRunTime)" -ForegroundColor White
} else {
    Write-Host "⚠️  Tarefa não encontrada após registro. Tente executar novamente como Admin." -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "  Comandos úteis:" -ForegroundColor DarkGray
Write-Host "  - Executar agora:  schtasks /run /tn `"$TaskName`"" -ForegroundColor DarkGray
Write-Host "  - Pausar:          schtasks /change /tn `"$TaskName`" /disable" -ForegroundColor DarkGray
Write-Host "  - Reativar:        schtasks /change /tn `"$TaskName`" /enable" -ForegroundColor DarkGray
Write-Host "  - Remover:         schtasks /delete /tn `"$TaskName`" /f" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Pressione Enter para fechar..." -ForegroundColor DarkGray
Read-Host
