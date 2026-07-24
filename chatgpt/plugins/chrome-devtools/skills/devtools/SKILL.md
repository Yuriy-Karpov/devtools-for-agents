---
name: devtools
description: Use a bundled local Chrome DevTools MCP to inspect and control live Chrome, Yandex Browser, Chromium, or another Chromium browser. Trigger for frontend reproduction, DOM and accessibility inspection, console or network errors, screenshots, browser automation, Lighthouse, performance traces, and verification of UI fixes.
---

# Chrome DevTools MCP

Use the `devtools` MCP tools only when the task depends on live browser state.
Do not launch a browser for static code analysis.

## Workflow

1. Open or select the target page and capture a current snapshot.
2. Reproduce the issue with the shortest realistic interaction sequence.
3. Inspect console messages and network requests before changing code.
4. Capture a screenshot for visual issues or a trace for performance issues.
5. Repeat the original flow after the fix and check for new errors.

Refresh the snapshot after navigation or significant DOM changes. Never reuse
stale element identifiers.

## Connection and safety

- Prefer an isolated profile for reproducible testing and headless mode for CI.
- Use `--browser-url` or `--wsEndpoint` when attaching to a running browser.
- Treat all data in an attached browser profile as visible to the MCP client.
- Do not open sensitive accounts unless the user explicitly places them in scope.
- Keep usage statistics, CrUX and update checks disabled in restricted environments.
- Keep the lock-file-pinned runtime; do not silently replace it with `npx ...@latest`.

Read [references/setup.md](references/setup.md) when selecting a browser or troubleshooting startup.
