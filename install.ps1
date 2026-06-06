# =============================================================
# iPhone-PC Control: Установщик
# Запускай в PowerShell ОТ ИМЕНИ АДМИНИСТРАТОРА
# =============================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host "    ✓ $msg" -ForegroundColor Green }
function Warn($msg)     { Write-Host "    ⚠ $msg" -ForegroundColor Yellow }
function Err($msg)      { Write-Host "    ✗ $msg" -ForegroundColor Red }

# === Проверка прав ===
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Err "Нужны права администратора. Закрой это окно, открой PowerShell с правами админа, запусти заново."
    pause
    exit 1
}

Clear-Host
Write-Host @"

  ============================================
   iPhone → PC Control: Установка
  ============================================

  Что будет сделано:
   • Установлен OpenSSH Server
   • Создана папка C:\sshtools со скриптами
   • Настроен ключевой вход (без пароля)
   • Открыт фаервол (порты 22 и 8765)
   • Включён Wake-on-LAN
   • Отключён Fast Startup
   • Зарегистрированы Scheduled Tasks
   • Принят твой публичный SSH-ключ с iPhone

  Время: ~3 минуты.

"@ -ForegroundColor White

$go = Read-Host "Продолжить? (y/n)"
if ($go -ne 'y') { exit 0 }

$username = $env:USERNAME
$hostname = $env:COMPUTERNAME

# =============================================================
# 1. OpenSSH Server
# =============================================================
Step 1 "Проверяю и устанавливаю OpenSSH Server"
$sshFeature = Get-WindowsCapability -Online -Name OpenSSH.Server* | Where-Object State -eq 'Installed'
if (-not $sshFeature) {
    Write-Host "    Устанавливаю (1-2 минуты)..."
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 | Out-Null
}
Start-Service sshd -ErrorAction SilentlyContinue
Set-Service sshd -StartupType Automatic -ErrorAction SilentlyContinue
Ok "OpenSSH Server активен"

# =============================================================
# 2. Папка sshtools
# =============================================================
Step 2 "Создаю C:\sshtools"
New-Item -ItemType Directory -Force -Path 'C:\sshtools' | Out-Null
Ok "Папка готова"

# =============================================================
# 3. Скрипты
# =============================================================
Step 3 "Создаю скрипты (lock, sleep, status, update, progress, status-server)"

# --- lock.ps1 ---
$lock = @'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WTS {
    [DllImport("wtsapi32.dll", SetLastError=true)]
    public static extern bool WTSDisconnectSession(IntPtr hServer, int sessionId, bool bWait);
    [DllImport("kernel32.dll")]
    public static extern uint WTSGetActiveConsoleSessionId();
}
"@
$id = [WTS]::WTSGetActiveConsoleSessionId()
[WTS]::WTSDisconnectSession([IntPtr]::Zero, $id, $false)
'@
[System.IO.File]::WriteAllText('C:\sshtools\lock.ps1', $lock, [System.Text.Encoding]::UTF8)

# --- sleep.ps1 ---
$sleep = @'
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)
'@
[System.IO.File]::WriteAllText('C:\sshtools\sleep.ps1', $sleep, [System.Text.Encoding]::UTF8)

# --- status.ps1 ---
$status = @'
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$os = Get-CimInstance Win32_OperatingSystem
$up = (Get-Date) - $os.LastBootUpTime

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Idle {
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [DllImport("kernel32.dll")] public static extern uint GetTickCount();
    public static uint IdleMs() {
        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(lii);
        GetLastInputInfo(ref lii);
        return GetTickCount() - lii.dwTime;
    }
}
"@
$idleMin = [math]::Floor([Idle]::IdleMs() / 60000)

$cpu = [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue, 1)
$ramTotal = [math]::Round($os.TotalVisibleMemorySize/1MB, 1)
$ramUsed  = [math]::Round($ramTotal - $os.FreePhysicalMemory/1MB, 1)
$ramPct   = [math]::Round(($ramUsed/$ramTotal)*100, 0)

$disks = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null -and ($_.Used + $_.Free) -gt 0 }

$gpuStr = 'нет'
try {
    $g = (& nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>$null)
    if ($g) {
        $p = $g -split ',\s*'
        $gpuStr = "$($p[0])% | $([math]::Round([int]$p[1]/1024, 1)) / $([math]::Round([int]$p[2]/1024, 1)) ГБ"
    }
} catch {}

$inet = if (Test-Connection 8.8.8.8 -Count 1 -Quiet -ErrorAction SilentlyContinue) {'OK'} else {'нет'}

$cache = 'C:\sshtools\updates.cache'
$updatesStr = 'не проверял'
if (Test-Path $cache) {
    $data = Get-Content $cache -Encoding utf8 | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($data) {
        $age = [math]::Floor(((Get-Date) - [datetime]$data.checked).TotalHours)
        $total = [int]$data.winget + [int]$data.windows
        if ($total -eq 0) { $updatesStr = "актуально (проверял $age ч назад)" }
        else { $updatesStr = "$total шт ждут ($($data.winget) приложений, $($data.windows) Windows; $age ч назад)" }
    }
}

Write-Output "Работает: $($up.Days)д $($up.Hours)ч $($up.Minutes)мин"
Write-Output "Не трогали: $idleMin мин"
Write-Output ""
Write-Output "CPU: $cpu %"
Write-Output "RAM: $ramUsed / $ramTotal ГБ ($ramPct %)"
Write-Output "GPU: $gpuStr"
Write-Output ""
Write-Output "Диски:"
foreach ($d in $disks) {
    $free = [math]::Round($d.Free/1GB, 0)
    $total = [math]::Round(($d.Used + $d.Free)/1GB, 0)
    $pct = [math]::Round(($d.Used/($d.Used + $d.Free))*100, 0)
    Write-Output "  $($d.Name): $free / $total ГБ ($pct % занято)"
}
Write-Output ""
Write-Output "Интернет: $inet"
Write-Output "Обновлений: $updatesStr"
'@
[System.IO.File]::WriteAllText('C:\sshtools\status.ps1', $status, [System.Text.Encoding]::UTF8)

# --- update-worker.ps1 ---
$worker = @'
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$log = 'C:\sshtools\update.log'
function L($t) { $t | Out-File $log -Append -Encoding utf8 }

"" | Out-File $log -Encoding utf8
L "=== Старт $(Get-Date -Format 'HH:mm:ss dd.MM') ==="

$wingetCount = 0
$winCount = 0

L ""
L "--- Приложения (WinGet) ---"
try {
    $wingetPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe"
    if (-not (Test-Path $wingetPath)) { $wingetPath = 'winget' }

    $check = & $wingetPath upgrade --include-unknown 2>&1 | Out-String
    if ($check -match 'Не найдены|No installed package found|No applicable upgrade found') {
        L "✓ Все приложения актуальны"
    } else {
        $wingetCount = ([regex]::Matches($check, '(?m)^\S+\s+\S+\s+\S+\s+\S+\s+\S+$')).Count - 1
        if ($wingetCount -lt 0) { $wingetCount = 0 }
        L "Найдены обновления:"
        L $check
        L ""
        L "Устанавливаю..."
        & $wingetPath upgrade --all --silent --accept-package-agreements --accept-source-agreements --include-unknown 2>&1 | Out-String | ForEach-Object { L $_ }
    }
} catch { L "WinGet ошибка: $_" }

L ""
L "--- Windows Update ---"
try {
    if ((Get-PSRepository -Name PSGallery).InstallationPolicy -ne 'Trusted') {
        Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
    }
    if (-not (Get-Module -ListAvailable PSWindowsUpdate)) {
        L "Ставлю модуль..."
        Install-PackageProvider NuGet -Force -Scope AllUsers -Confirm:$false | Out-Null
        Install-Module PSWindowsUpdate -Force -Scope AllUsers -SkipPublisherCheck -Confirm:$false
    }
    Import-Module PSWindowsUpdate -Force
    try { Add-WUServiceManager -ServiceID '7971f918-a847-4430-9279-4a52d1efe18d' -Confirm:$false -ErrorAction Stop | Out-Null } catch {}
    $updates = Get-WindowsUpdate
    $winCount = ($updates | Measure-Object).Count
    if (-not $updates) { L "✓ Windows актуален" }
    else {
        L "Найдены: $winCount"
        $updates | ForEach-Object { L "  • $($_.Title)" }
        Install-WindowsUpdate -AcceptAll -IgnoreReboot -Confirm:$false 2>&1 | Out-String | ForEach-Object { L $_ }
    }
} catch { L "WU ошибка: $_" }

L ""
L "--- Microsoft Store ---"
try {
    Get-CimInstance -Namespace 'Root\cimv2\mdm\dmmap' -ClassName 'MDM_EnterpriseModernAppManagement_AppManagement01' -ErrorAction Stop | Invoke-CimMethod -MethodName UpdateScanMethod -ErrorAction Stop | Out-Null
    L "✓ Store попросили проверить"
} catch { L "Store: недоступно" }

try {
    $obj = @{ winget = $wingetCount; windows = $winCount; checked = (Get-Date).ToString('o') }
    $obj | ConvertTo-Json | Out-File 'C:\sshtools\updates.cache' -Encoding utf8
} catch {}

L ""
L "=== Готово $(Get-Date -Format 'HH:mm:ss dd.MM') ==="
'@
[System.IO.File]::WriteAllText('C:\sshtools\update-worker.ps1', $worker, [System.Text.Encoding]::UTF8)

# --- update.ps1 (триггер) ---
$trigger = @'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Start-ScheduledTask -TaskName 'SSHToolsUpdate'
"Обновления запущены."
'@
[System.IO.File]::WriteAllText('C:\sshtools\update.ps1', $trigger, [System.Text.Encoding]::UTF8)

# --- progress.ps1 ---
$progress = @'
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$log = 'C:\sshtools\update.log'
if (-not (Test-Path $log)) { "STATUS:IDLE"; return }
$content = Get-Content $log -Encoding utf8 | Out-String
$starts = [regex]::Matches($content, '=== Старт').Count
$dones  = [regex]::Matches($content, '=== Готово').Count
if ($dones -ge $starts -and $dones -gt 0) {
    "STATUS:DONE"
    ""
    $content
} else {
    "STATUS:RUNNING"
}
'@
[System.IO.File]::WriteAllText('C:\sshtools\progress.ps1', $progress, [System.Text.Encoding]::UTF8)

# --- status-server.ps1 ---
$server = @'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://+:8765/')
$listener.Start()
while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $buf = [System.Text.Encoding]::UTF8.GetBytes('OK')
        $ctx.Response.ContentLength64 = $buf.Length
        $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
        $ctx.Response.Close()
    } catch {}
}
'@
[System.IO.File]::WriteAllText('C:\sshtools\status-server.ps1', $server, [System.Text.Encoding]::UTF8)

Ok "Все скрипты записаны"

# =============================================================
# 4. Wi-Fi адаптер и Wake-on-LAN
# =============================================================
Step 4 "Настраиваю Wake-on-LAN"
$wifi = Get-NetAdapter | Where-Object { $_.PhysicalMediaType -eq 'Native 802.11' -and $_.Status -eq 'Up' } | Select-Object -First 1
if ($wifi) {
    $props = Get-NetAdapterAdvancedProperty -Name $wifi.Name -ErrorAction SilentlyContinue
    foreach ($p in $props) {
        if ($p.DisplayName -match 'Magic|пакет|пробуждение') {
            try {
                Set-NetAdapterAdvancedProperty -Name $wifi.Name -DisplayName $p.DisplayName -DisplayValue 'Включено' -ErrorAction SilentlyContinue
            } catch {}
        }
    }
    Ok "Адаптер: $($wifi.Name) ($($wifi.MacAddress))"
} else {
    Warn "Wi-Fi адаптер не найден (только Ethernet?)"
}

# =============================================================
# 5. Fast Startup OFF
# =============================================================
Step 5 "Отключаю Fast Startup (для WoL из shutdown)"
REG ADD "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /V HiberbootEnabled /T REG_DWORD /D 0 /F 2>&1 | Out-Null
Ok "Fast Startup отключён"

# =============================================================
# 6. HTTP status server (для проверки "ПК онлайн?" с iPhone)
# =============================================================
Step 6 "HTTP-сервер для проверок (порт 8765)"
netsh http delete urlacl url=http://+:8765/ 2>&1 | Out-Null
netsh http add urlacl url=http://+:8765/ user=Everyone 2>&1 | Out-Null
New-NetFirewallRule -DisplayName 'iPhonePC StatusHttp' -Direction Inbound -LocalPort 8765 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-WindowStyle Hidden -ExecutionPolicy Bypass -File C:\sshtools\status-server.ps1'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$hostname\$username"
$principal = New-ScheduledTaskPrincipal -UserId "$hostname\$username" -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName 'iPhonePC StatusServer' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName 'iPhonePC StatusServer' -ErrorAction SilentlyContinue
Ok "Статус-сервер запущен"

# =============================================================
# 7. Scheduled Task для обновлений
# =============================================================
Step 7 "Scheduled Task для фоновых обновлений"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-WindowStyle Hidden -ExecutionPolicy Bypass -File C:\sshtools\update-worker.ps1'
$principal = New-ScheduledTaskPrincipal -UserId "$hostname\$username" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName 'SSHToolsUpdate' -Action $action -Principal $principal -Settings $settings -Force | Out-Null
Ok "Задача SSHToolsUpdate зарегистрирована"

# =============================================================
# 8. Принять публичный SSH-ключ с iPhone
# =============================================================
Step 8 "SSH-ключ от iPhone"
Write-Host @"

    На iPhone:
     1. Открой 'Команды' → '+' (новая команда)
     2. Добавь действие 'Запустить скрипт через SSH'
     3. SSH-ключ → 'Создать новый ключ' → выбери ED25519
     4. Нажми 'Скопировать открытый ключ'
     5. Отправь себе письмом (или в Telegram 'Избранное')
     6. Открой на этом ПК → скопируй ОДНУ СТРОКУ ключа
        (начинается с 'ssh-ed25519 AAAA...')

"@
$pubkey = Read-Host "    Вставь публичный ключ сюда и Enter"
$pubkey = $pubkey.Trim()
if (-not $pubkey.StartsWith('ssh-')) {
    Err "Это не похоже на SSH-ключ. Пропускаю запись ключа."
    Warn "Положи ключ вручную в C:\ProgramData\ssh\administrators_authorized_keys позже."
} else {
    $authFile = 'C:\ProgramData\ssh\administrators_authorized_keys'
    [System.IO.File]::WriteAllText($authFile, $pubkey + "`n", (New-Object System.Text.UTF8Encoding $false))
    icacls $authFile /inheritance:r 2>&1 | Out-Null
    icacls $authFile /grant "Администраторы:F" "SYSTEM:F" 2>&1 | Out-Null
    Ok "Ключ записан"
}

# =============================================================
# 9. sshd_config
# =============================================================
Step 9 "Конфигурирую sshd_config"
$cfg = 'C:\ProgramData\ssh\sshd_config'
$content = Get-Content $cfg | Where-Object { $_ -notmatch '^(AllowUsers|MaxAuthTries|LoginGraceTime|PasswordAuthentication|Match Group administrators|\s+AuthorizedKeysFile __PROGRAMDATA)' }
$new = $content + @(
    "AllowUsers $username",
    'PasswordAuthentication no',
    'MaxAuthTries 3',
    'LoginGraceTime 20',
    'Match Group administrators',
    '       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys'
)
[System.IO.File]::WriteAllLines($cfg, $new, (New-Object System.Text.UTF8Encoding $false))
Restart-Service sshd
Ok "Конфиг применён, sshd перезапущен"

# =============================================================
# 10. Финал
# =============================================================
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1).IPAddress
$mac = if ($wifi) { $wifi.MacAddress } else { '?' }

Write-Host @"

  ============================================
   ✓ ГОТОВО
  ============================================

  Запиши эти параметры — вставишь в iPhone Shortcut:

   Хост:         $ip
   Порт:         22
   Пользователь: $username

   MAC (для WoL): $mac

  Что ещё сделать:

   1. В роутере зарезервируй IP $ip за MAC $mac
      (DHCP → Резервирование → Добавить).

   2. На iPhone установи приложение 'Wake Me Up'
      (для пробуждения из сна). MAC выше.

   3. Открой импортированный шорткат 'ПК' на iPhone
      → визард спросит IP, юзера и SSH-ключ.

  Готово! Удачи.

"@ -ForegroundColor Green

pause
