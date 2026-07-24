# Chrome DevTools для Qwen Code

Offline-расширение подключает Qwen Code к Chrome или другому Chromium-браузеру.
В комплект входят skill `devtools`, MCP runtime и все Node.js-зависимости;
`npm install` и `npx` не нужны.

## Требования

- Qwen Code с поддержкой extensions и skills;
- Node.js `^20.19.0`, `^22.12.0` или `>=23`;
- Chrome, Chromium, Yandex Browser или другой Chromium-браузер.

## Установка

Клонируйте репозиторий и установите расширение из каталога `qwencode/`:

```bash
git clone https://github.com/Yuriy-Karpov/devtools-for-agents.git
qwen extensions install /полный/путь/devtools-for-agents/qwencode
```

```bash
qwen extensions update chrome-devtools
qwen extensions link /полный/путь/devtools-for-agents/qwencode
```

## Выбор браузера

Без дополнительной настройки MCP ищет установленный Chrome. Чтобы выбрать
другой Chromium-браузер, запустите Qwen Code с абсолютным путём:

```bash
CHROME_DEVTOOLS_BROWSER_PATH="/Applications/Yandex.app" qwen
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/yandex-browser-stable" qwen
CHROME_DEVTOOLS_BROWSER_PATH="/usr/bin/chromium" qwen
```

Проверка: откройте `/extensions`, `/skills` и `/mcp`, затем попросите skill
`devtools` открыть `https://example.com` и сделать snapshot.
