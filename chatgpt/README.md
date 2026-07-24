# Chrome DevTools plugin для Codex

Кроссплатформенный плагин Chrome DevTools MCP:

- Codex app на macOS;
- Codex app на Windows;
- Codex CLI на Linux (также работает из CLI на macOS и Windows).

В репозитории хранятся launcher, skill-набор, `package.json` и
`package-lock.json`. Каталог `node_modules` в Git не хранится. Установщик
выполняет `npm ci` перед установкой плагина в Codex, после чего MCP запускается
локально без `npx` и автоматического обновления версии.

## Требования

- Node.js `20.19+`, `22.12+` или `23+`;
- установленный Codex app для графической установки;
- команда `codex` в `PATH` для CLI-установки;
- Google Chrome, Chromium, Microsoft Edge, Yandex Browser или другой
  Chromium-браузер.

Проверка:

```bash
node --version
codex --version
```

## Codex app — macOS

1. Клонируйте репозиторий.
2. Дважды нажмите `chatgpt/install-codex-macos.command`.
3. На открывшейся странице Codex установите или включите Chrome DevTools.
4. Создайте новую задачу Codex.

Для совместимости сохранён старый ярлык `open-plugin.command`.

## Codex app — Windows

1. Клонируйте репозиторий.
2. Дважды нажмите `chatgpt\install-codex-windows.cmd`.
3. На открывшейся странице Codex установите или включите Chrome DevTools.
4. Создайте новую задачу Codex.

Если Windows блокирует запуск загруженного файла, откройте Terminal в каталоге
`chatgpt` и выполните:

```bat
node install.mjs --app
```

## Codex CLI — Linux

Из корня репозитория:

```bash
chmod +x chatgpt/install-codex-linux.sh
./chatgpt/install-codex-linux.sh
```

Установщик:

1. проверяет версию Node.js и целостность дистрибутива;
2. устанавливает MCP-зависимости строго по lock-файлу через `npm ci`;
3. подключает локальный marketplace, если он ещё не подключён;
4. устанавливает `chrome-devtools@chrome-devtools-local`;
5. не заменяет другой marketplace с тем же именем без явного решения
   пользователя.

После установки запустите новую сессию Codex:

```bash
codex
```

Универсальная команда для CLI на любой поддерживаемой платформе:

```bash
node chatgpt/install.mjs --cli
```

Безопасно проверить действия без изменения конфигурации:

```bash
node chatgpt/install.mjs --cli --dry-run
```

## Ручная установка MCP-зависимостей

Если зависимости нужно установить отдельно от установщика Codex:

```bash
cd chatgpt
npm run install:mcp
```

То же действие через универсальный установщик:

```bash
node install.mjs --deps-only
```

Эквивалентная низкоуровневая команда:

```bash
npm ci --omit=dev --no-audit --no-fund \
  --prefix plugins/chrome-devtools/mcp/chrome-devtools-mcp-runtime
```

Версия `chrome-devtools-mcp` зафиксирована в lock-файле. Для установки требуется
доступ к npm registry; после успешного `npm ci` обычный запуск MCP не требует
скачивания пакетов.

## Выбор браузера

Автоматический поиск браузера:

```bash
node chatgpt/configure-browser.mjs --auto
```

Интерактивный выбор:

```bash
node chatgpt/configure-browser.mjs
```

Явный путь:

```bash
node chatgpt/configure-browser.mjs "/usr/bin/chromium"
```

На macOS можно дважды нажать `select-browser-macos.command`, на Windows —
`select-browser-windows.cmd`. Текущую настройку показывает:

```bash
node chatgpt/configure-browser.mjs --show
```

Настройка хранится в:

| Платформа | Путь |
| --- | --- |
| macOS/Linux | `$XDG_CONFIG_HOME/chrome-devtools-mcp/browser-path` или `~/.config/chrome-devtools-mcp/browser-path` |
| Windows | `%LOCALAPPDATA%\chrome-devtools-mcp\browser-path` |

Вместо файла можно задать `CHROME_DEVTOOLS_BROWSER_PATH`. Также поддерживаются
`CHROME_DEVTOOLS_BROWSER_PATH_MAC`, `CHROME_DEVTOOLS_BROWSER_PATH_WINDOWS` и
`CHROME_DEVTOOLS_BROWSER_PATH_LINUX`.

## Удаление

macOS:

```text
Дважды нажмите chatgpt/uninstall-codex-macos.command
```

Windows:

```text
Дважды нажмите chatgpt\uninstall-codex-windows.cmd
```

Linux:

```bash
./chatgpt/uninstall-codex-linux.sh
```

Универсальная команда:

```bash
node chatgpt/uninstall.mjs
```

Или через npm:

```bash
cd chatgpt
npm run uninstall:codex
```

По умолчанию удаляются установленный плагин, регистрация локального marketplace
и сгенерированный `node_modules`. Исходники репозитория и выбранный путь браузера
сохраняются. Дополнительные режимы:

```bash
# Показать действия без удаления
node chatgpt/uninstall.mjs --dry-run

# Сохранить регистрацию marketplace
node chatgpt/uninstall.mjs --keep-marketplace

# Сохранить установленные npm-зависимости
node chatgpt/uninstall.mjs --keep-deps
```

Перед удалением скрипт проверяет, что одноимённые plugin и marketplace относятся
к этому каталогу. Если Codex CLI установлен нестандартно, укажите исполняемый
файл через `CODEX_BIN`.

## Диагностика

Список marketplace и установленных плагинов:

```bash
codex plugin marketplace list
codex plugin list
```

Если после установки инструменты не появились, полностью перезапустите Codex и
создайте новую задачу: уже открытая задача не подхватывает новый набор skill и
MCP-инструментов. Если был удалён `node_modules`, повторите
`npm run install:mcp`, а затем переустановите плагин.
