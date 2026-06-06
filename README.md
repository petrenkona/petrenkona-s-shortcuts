# Управление ПК с iPhone

Управляй своим ПК с iPhone через Action Button или иконку быстрой команды: блокируй, усыпляй, перезагружай, выключай, включай и проверяй статус — одним тапом.

## Что это умеет

- 🔒 **Заблокировать** экран ПК
- 💤 **Усыпить** или **гибернировать** ПК
- 🔄 **Перезагрузить** (опционально — сразу в BIOS)
- ⏻ **Выключить** ПК полностью
- ⚡ **Включить** ПК через Wake-on-LAN или умную розетку
- 📊 **Статус** — uptime, CPU/RAM/GPU, свободное место, доступные обновления
- 📥 **Обновить всё** — Windows + WinGet + Microsoft Store одной кнопкой

Всё через защищённый SSH-канал с авторизацией по ключу (приватник хранится в Secure Enclave iPhone, наружу не выходит).

## Что понадобится

- ПК на Windows 10 или 11
- iPhone с iOS 17+ (для Action Button — iPhone 15 Pro и старше; на остальных работает через иконку)
- Wi-Fi роутер
- *(Опционально)* Умная розетка (Яндекс / Aqara / TP-Link Kasa) — нужна **только** если хочешь включать ПК из полного выключения, а не только из сна

## Установка

### 1. ПК — одна команда

Открой PowerShell **от имени администратора** (правый клик на иконку → "Запуск от имени администратора") и выполни:

```powershell
irm https://raw.githubusercontent.com/petrenkona/petrenkonas-shortcuts/main/install.ps1 -OutFile $env:TEMP\install.ps1
& $env:TEMP\install.ps1
```

Это скачает и запустит установщик. Дальше следуй инструкциям на экране — он:

- ✓ Установит OpenSSH Server
- ✓ Создаст всё необходимое в `C:\sshtools\`
- ✓ Настроит фаервол (порты 22 и 8765)
- ✓ Включит Wake-on-LAN
- ✓ Отключит Fast Startup (для корректного WoL)
- ✓ Зарегистрирует Scheduled Tasks
- ✓ Попросит вставить публичный SSH-ключ с твоего iPhone

⏱ Занимает ~3 минуты.

### 2. BIOS — одна настройка

Чтобы умная розетка могла включать ПК:

1. Перезагрузи ПК → во время загрузки жми **Del** (или F2 на ноутбуках).
2. Найди опцию **"Restore on AC Power Loss"** / **"AC Power Recovery"** / **"После сбоя электропитания"**.
3. Поставь значение **"Power On"** (Включён).
4. Сохрани (F10) и выйди.

### 3. Роутер — резервация IP

Чтобы IP ПК не менялся, в админке роутера привяжи его за MAC-адресом:

1. Браузер → `http://192.168.0.1` (или `http://192.168.1.1`).
2. Логин/пароль — что устанавливал, или указан на наклейке снизу.
3. Найди раздел **DHCP** → **Резервирование адресов** (или Address Reservation / Static Lease).
4. Добавь связку IP ↔ MAC ПК.

(IP и MAC были выведены установщиком в конце.)

### 4. iPhone — Wake Me Up для пробуждения

1. Скачай приложение **Wake Me Up** в App Store.
2. Открой → "+ Add Device":
   - **Name:** `Мой ПК`
   - **MAC:** твой MAC из установщика
   - **IP/Host:** `192.168.0.255` (broadcast)
   - **Port:** `9`
3. Сохрани.

### 5. iPhone — главный шорткат

*(Шорткат с визардом — будет добавлен в следующей версии.)*

Пока что:
1. Открой **Команды** → "+" → новая команда.
2. Добавь **"Запустить скрипт через SSH"**.
3. Заполни:
   - **Хост:** IP из установщика
   - **Порт:** `22`
   - **Пользователь:** твой Windows-логин
   - **Аутентификация:** "SSH-ключ" → "Создать новый" → ED25519
4. Скопируй открытый ключ и вставь в установщик, когда он попросит.
5. **Скрипт** для каждого действия — см. ниже.

| Команда | Скрипт |
|---|---|
| Заблокировать | `powershell -ExecutionPolicy Bypass -File C:\sshtools\lock.ps1` |
| Усыпить | `powershell -ExecutionPolicy Bypass -File C:\sshtools\sleep.ps1` |
| Перезагрузить | `shutdown /r /t 0` |
| Перезагрузка в BIOS | `shutdown /r /fw /t 0` |
| Выключить | `shutdown /s /t 0` |
| Статус | `chcp 65001 >nul & powershell -ExecutionPolicy Bypass -File C:\sshtools\status.ps1` |
| Обновить всё | `chcp 65001 >nul & powershell -ExecutionPolicy Bypass -File C:\sshtools\update.ps1` |
| Прогресс обновлений | `chcp 65001 >nul & powershell -ExecutionPolicy Bypass -File C:\sshtools\progress.ps1` |

## Безопасность

- **Только ключ:** парольный SSH-вход отключён, брутфорс невозможен.
- **Только твой юзер:** `AllowUsers <твой_логин>` — никто другой не подключится даже с другим ключом.
- **3 попытки:** после неудачных аутентификаций соединение рвётся.
- **Локальная сеть:** ничего не пробрасывается наружу, всё работает только в твоей Wi-Fi.

## Что в логах

- `C:\sshtools\update.log` — лог обновлений
- `C:\sshtools\updates.cache` — кеш количества доступных апдейтов (читает `status.ps1`)
- Журнал Windows → `OpenSSH/Operational` — все попытки подключения

## Удаление

```powershell
# Остановить и убрать sshd
Stop-Service sshd
Set-Service sshd -StartupType Disabled
Remove-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Снять scheduled tasks
Unregister-ScheduledTask -TaskName 'SSHToolsUpdate' -Confirm:$false
Unregister-ScheduledTask -TaskName 'iPhonePC StatusServer' -Confirm:$false

# Удалить файлы
Remove-Item -Recurse -Force C:\sshtools

# Снять URL ACL и фаервол
netsh http delete urlacl url=http://+:8765/
Remove-NetFirewallRule -DisplayName 'iPhonePC StatusHttp'
```

## Решение проблем

### "ПК не отвечает" хотя ПК включён
- Проверь что iPhone и ПК в одной Wi-Fi сети.
- Проверь что VPN на ПК выключен (он перехватывает локальный трафик).
- IP ПК мог поменяться — посмотри `ipconfig | findstr IPv4` и обнови в шорткате.

### Lock не блокирует экран
- Команда должна быть именно `powershell -ExecutionPolicy Bypass -File C:\sshtools\lock.ps1`, а не голый `rundll32` — иначе блокируется SSH-сессия, а не твоя.

### WoL не будит из полного выключения
- Fast Startup должен быть выключен (установщик это делает).
- В Диспетчере устройств → Wi-Fi адаптер → Управление электропитанием → обе галки про вывод из ждущего режима.

### Обновлений нет, но кеш пустой
- Запусти **"Обновить всё на ПК"** один раз. Worker заполнит кеш в `updates.cache`, после этого статус будет показывать актуальное число.

---

Создано Никитой 🎉
