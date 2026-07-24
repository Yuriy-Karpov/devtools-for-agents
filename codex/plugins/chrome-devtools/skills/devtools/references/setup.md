# Browser setup

The plugin pins `chrome-devtools-mcp` in `package-lock.json`. The distribution
installer runs `npm ci` before Codex installs the plugin; `node_modules` is not
stored in the repository. The MCP launcher itself never uses `npx` or silently
updates the pinned dependency.

With no override, upstream MCP searches for Chrome. To choose a browser
explicitly, run `node configure-browser.mjs` from the marketplace directory. On
macOS, `select-browser-macos.command` provides the same flow; on Windows use
`select-browser-windows.cmd`.

The selection is stored under the platform configuration directory:

- macOS/Linux: `$XDG_CONFIG_HOME/chrome-devtools-mcp/browser-path`, falling back
  to `~/.config/chrome-devtools-mcp/browser-path`;
- Windows: `%LOCALAPPDATA%\chrome-devtools-mcp\browser-path`.

The `CHROME_DEVTOOLS_BROWSER_PATH` environment override is also supported.

Explicit `--browser-url`, `--wsEndpoint`, and `--autoConnect` connection options
take precedence over the browser path. If tools are missing, confirm that the
plugin is enabled in Codex, start a new task, and run `npm run install:mcp` from
the marketplace directory if `node_modules` is missing.
