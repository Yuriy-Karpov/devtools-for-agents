# Chrome DevTools MCP distributions

Независимые дистрибутивы `chrome-devtools-mcp`. Сборки GigaCode, Qwen Code и
OpenCode содержат собственные runtime и `node_modules`. Сборка Codex хранит
зависимости в `package-lock.json` и устанавливает их через `npm ci`.

| Каталог | Клиент | Браузер |
| --- | --- | --- |
| `gigacode/` | GigaCode | Специализированная брендированная сборка |
| `qwencode/` | Qwen Code | Chrome или другой Chromium-браузер |
| `opencode/` | OpenCode | Chrome или другой Chromium-браузер |
| `chatgpt/` | Codex app (macOS/Windows) и Codex CLI (Linux) | Chrome или другой Chromium-браузер |

В нейтральных дистрибутивах путь к Yandex Browser, Chromium или другому
совместимому браузеру задаётся через `CHROME_DEVTOOLS_BROWSER_PATH`.

## Получение исходников

Проект поставляется через Git без собранных архивов:

```bash
git clone <git-url> devtools-for-agents
cd devtools-for-agents
```

После клонирования используйте инструкцию из каталога нужного клиента.
