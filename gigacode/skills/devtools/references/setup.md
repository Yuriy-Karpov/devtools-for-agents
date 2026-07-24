# Настройка и диагностика

## Требования

- Node.js `^20.19.0`, `^22.12.0` или `>=23`
- актуальный Google Chrome или Chrome for Testing
- Qwen Code с поддержкой project skills и MCP

## Конфигурация

Конфигурация MCP находится в `gigacode-extension.json`. Переменная `${extensionPath}` позволяет запускать MCP из каталога, куда GigaCode скопировал расширение.

Для запуска Chromium-браузера, отличного от Google Chrome, задать оба пути в
`env`:

```json
"CHROME_DEVTOOLS_BROWSER_PATH_MAC": "/Applications/Yandex.app",
"CHROME_DEVTOOLS_BROWSER_PATH_LINUX": "/usr/bin/yandex-browser-stable"
```

Launcher определяет `darwin` или `linux` и выбирает нужную переменную. Общая
переменная `CHROME_DEVTOOLS_BROWSER_PATH` имеет приоритет и может использоваться
для ручного переопределения. На macOS можно указывать как `.app`, так и бинарник
`/Applications/Yandex.app/Contents/MacOS/Yandex`. Для Linux и Windows указывать
полный путь к исполняемому файлу. Явные аргументы `--executablePath`,
`--browser-url`, `--ws-endpoint` или `--auto-connect` имеют приоритет над
переменной окружения.

Основные варианты аргументов:

```json
["mcp/sberbro-devtools-mcp/run-sberbro-devtools-mcp.mjs", "--isolated", "--headless"]
```

```json
["mcp/sberbro-devtools-mcp/run-sberbro-devtools-mcp.mjs", "--browser-url=http://127.0.0.1:9222"]
```

Для подключения по порту запустить Chrome с remote debugging в отдельном профиле. Не использовать основной профиль с чувствительными сессиями.

## Диагностика

- `qwen --debug` — увидеть ошибки загрузки skill.
- `/skills` — убедиться, что `devtools` обнаружен.
- `/mcp` — проверить подключение, инструменты и журналы MCP.
- `node mcp/sberbro-devtools-mcp/run-sberbro-devtools-mcp.mjs --help` — проверить локальный сервер без запуска браузера.

Сервер не запускает Chrome при одном только MCP-handshake. Браузер появляется при первом вызове инструмента, которому он нужен.

## Закрытый контур

Каталог `mcp/sberbro-devtools-mcp/node_modules` должен передаваться вместе с расширением. На целевой машине `npm install` не требуется. Браузер устанавливается и обновляется отдельно средствами организации.
