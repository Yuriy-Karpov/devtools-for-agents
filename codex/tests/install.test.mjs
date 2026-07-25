import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { access, chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const distributionRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const installer = path.join(distributionRoot, "install.mjs");
const uninstaller = path.join(distributionRoot, "uninstall.mjs");
const browserConfigurator = path.join(
  distributionRoot,
  "configure-browser.mjs",
);

async function createCodexStub() {
  const root = await mkdtemp(path.join(tmpdir(), "codex-plugin-installer-"));
  const stub = path.join(root, "codex-stub.mjs");
  const log = path.join(root, "calls.jsonl");
  await writeFile(
    stub,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.CODEX_TEST_LOG, JSON.stringify(args) + "\\n");
if (args.join(" ") === "plugin marketplace list --json") {
  console.log(JSON.stringify({ marketplaces: JSON.parse(process.env.CODEX_TEST_MARKETPLACES) }));
}
if (args.join(" ") === "plugin list --json") {
  console.log(JSON.stringify({ installed: JSON.parse(process.env.CODEX_TEST_PLUGINS || "[]") }));
}
`,
    "utf8",
  );
  await chmod(stub, 0o755);
  return { stub, log };
}

async function recordedCalls(log) {
  return (await readFile(log, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("CLI installer registers a new marketplace and installs the plugin", async () => {
  const { stub, log } = await createCodexStub();
  execFileSync(process.execPath, [installer, "--cli"], {
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_TEST_SKIP_RUNTIME_INSTALL: "1",
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: "[]",
    },
  });
  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
    ["plugin", "marketplace", "add", distributionRoot],
    ["plugin", "add", "chrome-devtools@chrome-devtools-local"],
  ]);
});

test("CLI installer is idempotent for an existing local marketplace", async () => {
  const marketplaces = [
    { name: "chrome-devtools-local", root: distributionRoot },
  ];
  const { stub, log } = await createCodexStub();
  execFileSync(process.execPath, [installer, "--cli"], {
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_TEST_SKIP_RUNTIME_INSTALL: "1",
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: JSON.stringify(marketplaces),
    },
  });
  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
    ["plugin", "add", "chrome-devtools@chrome-devtools-local"],
  ]);
});

test("CLI installer refuses a same-name marketplace from another root", async () => {
  const marketplaces = [
    { name: "chrome-devtools-local", root: path.join(tmpdir(), "other") },
  ];
  const { stub, log } = await createCodexStub();
  const result = spawnSync(process.execPath, [installer, "--cli"], {
    encoding: "utf8",
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_TEST_SKIP_RUNTIME_INSTALL: "1",
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: JSON.stringify(marketplaces),
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already points to/);
  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
  ]);
});

test("browser configuration writes to an explicit cross-platform config file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "codex-browser-config-"));
  const configFile = path.join(root, "nested", "browser-path");
  execFileSync(process.execPath, [browserConfigurator, process.execPath], {
    env: {
      ...process.env,
      CHROME_DEVTOOLS_BROWSER_PATH_FILE: configFile,
    },
  });
  assert.equal((await readFile(configFile, "utf8")).trim(), process.execPath);
});

test("uninstaller removes only the matching plugin and marketplace", async () => {
  const marketplaces = [
    { name: "chrome-devtools-local", root: distributionRoot },
  ];
  const plugins = [
    {
      pluginId: "chrome-devtools@chrome-devtools-local",
      marketplaceSource: { source: distributionRoot },
    },
  ];
  const { stub, log } = await createCodexStub();
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-home-"));
  execFileSync(process.execPath, [uninstaller, "--keep-deps"], {
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_HOME: codexHome,
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: JSON.stringify(marketplaces),
      CODEX_TEST_PLUGINS: JSON.stringify(plugins),
    },
  });
  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
    ["plugin", "list", "--json"],
    ["plugin", "remove", "chrome-devtools@chrome-devtools-local"],
    ["plugin", "marketplace", "remove", "chrome-devtools-local"],
  ]);
});

test("uninstaller refuses a same-name marketplace from another root", async () => {
  const marketplaces = [
    { name: "chrome-devtools-local", root: path.join(tmpdir(), "other") },
  ];
  const { stub, log } = await createCodexStub();
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-home-"));
  const result = spawnSync(process.execPath, [uninstaller, "--keep-deps"], {
    encoding: "utf8",
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_HOME: codexHome,
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: JSON.stringify(marketplaces),
      CODEX_TEST_PLUGINS: "[]",
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /points to another directory/);
  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
  ]);
});

test("uninstaller is idempotent when plugin and marketplace are absent", async () => {
  const { stub, log } = await createCodexStub();
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-home-"));
  execFileSync(process.execPath, [uninstaller, "--keep-deps"], {
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_HOME: codexHome,
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: "[]",
      CODEX_TEST_PLUGINS: "[]",
    },
  });
  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
    ["plugin", "list", "--json"],
  ]);
});

test("uninstaller cleans stale cache when plugin is no longer listed", async () => {
  const { stub, log } = await createCodexStub();
  const codexHome = await mkdtemp(path.join(tmpdir(), "codex-home-"));
  const staleCache = path.join(
    codexHome,
    "plugins",
    "cache",
    "chrome-devtools-local",
    "chrome-devtools",
    "old-version",
  );
  await writeFile(path.join(codexHome, ".keep"), "", "utf8");
  await mkdir(staleCache, { recursive: true });
  await writeFile(path.join(staleCache, "stale.txt"), "stale", "utf8");

  execFileSync(process.execPath, [uninstaller, "--keep-deps"], {
    env: {
      ...process.env,
      CODEX_BIN: stub,
      CODEX_HOME: codexHome,
      CODEX_TEST_LOG: log,
      CODEX_TEST_MARKETPLACES: "[]",
      CODEX_TEST_PLUGINS: "[]",
    },
  });

  assert.deepEqual(await recordedCalls(log), [
    ["plugin", "marketplace", "list", "--json"],
    ["plugin", "list", "--json"],
    ["plugin", "remove", "chrome-devtools@chrome-devtools-local"],
  ]);
  await assert.rejects(access(path.dirname(staleCache)));
});
