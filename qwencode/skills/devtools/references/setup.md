# Настройка браузера

Расширение настраивает MCP в `qwen-extension.json` и запускает bundled runtime
через `${extensionPath}`. Интернет при запуске не требуется.

Без `CHROME_DEVTOOLS_BROWSER_PATH` сервер использует стандартный поиск Chrome.
Для Yandex Browser, Chromium или другого совместимого браузера перед запуском
Qwen Code задать абсолютный путь:

```bash
CHROME_DEVTOOLS_BROWSER_PATH="/Applications/Yandex.app" qwen
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/yandex-browser-stable" qwen
```

Явные `--browser-url`, `--wsEndpoint` и `--autoConnect` имеют приоритет над
переменной пути. При отсутствии инструментов проверить `/extensions`, `/skills`,
`/mcp`, Node.js и bundled `node_modules`.

