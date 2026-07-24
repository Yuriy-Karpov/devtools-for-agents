# Chrome DevTools для OpenCode

Offline-набор подключает OpenCode к Chrome или другому Chromium-браузеру. Он
содержит project-конфигурацию, skill `devtools`, MCP runtime и `node_modules`.

# Два варианта установки: 

## Запуск из каталога

Откройте `opencode/` как workspace и запустите OpenCode. Клиент прочитает
`opencode.json`, а skill — из `.opencode/skills/devtools/`.

## Глобальная установка (рекомендуется)

Клонируйте репозиторий, перейдите в каталог `opencode/` и выполните:

```bash
git clone <git-url> devtools-for-agents
cd devtools-for-agents/opencode
node install.mjs
```

Установщик копирует runtime в `~/.local/share/opencode/chrome-devtools`, skill в
`~/.config/opencode/skills/devtools` и добавляет `mcp.devtools` в пользовательский
`opencode.json`. Существующий JSON-конфиг сохраняется в backup. Если конфиг
использует JSONC-комментарии, установщик остановится без изменений — тогда
перенесите секцию `mcp.devtools` из локального `opencode.json` вручную.

Удаление:

```bash
node uninstall.mjs
```

## Выбор браузера

```bash
CHROME_DEVTOOLS_BROWSER_PATH="/Applications/Yandex.app" opencode
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/yandex-browser-stable" opencode
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/chromium" opencode
```
