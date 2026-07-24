# Настройка браузера

Project-конфигурация находится в `opencode.json`. Глобальный установщик создаёт
эквивалентную секцию `mcp.devtools` в пользовательском конфиге.

Без `CHROME_DEVTOOLS_BROWSER_PATH` upstream MCP использует стандартный Chrome.
Для Yandex Browser или Chromium запустить OpenCode с абсолютным путём:

```bash
CHROME_DEVTOOLS_BROWSER_PATH="/Applications/Yandex.app" opencode
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/yandex-browser-stable" opencode
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/chromium" opencode
```

Явные `--browser-url`, `--wsEndpoint` и `--autoConnect` имеют приоритет над путём.
При отсутствии инструментов проверить конфиг, Node.js и bundled `node_modules`.

