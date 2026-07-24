#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const distributionRoot = path.dirname(fileURLToPath(import.meta.url));
const marketplaceFile = path.join(
  distributionRoot,
  ".agents",
  "plugins",
  "marketplace.json",
);
const pluginRoot = path.join(
  distributionRoot,
  "plugins",
  "chrome-devtools",
);
const pluginManifest = path.join(pluginRoot, ".codex-plugin", "plugin.json");
const runtimeRoot = path.join(
  pluginRoot,
  "mcp",
  "chrome-devtools-mcp-runtime",
);
const runtimePackage = path.join(runtimeRoot, "package.json");
const runtimeLock = path.join(runtimeRoot, "package-lock.json");
const runtimeEntryPoint = path.join(
  runtimeRoot,
  "node_modules",
  "chrome-devtools-mcp",
  "build",
  "src",
  "bin",
  "chrome-devtools-mcp.js",
);
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const dependenciesOnly = args.has("--deps-only");
const mode = args.has("--app")
  ? "app"
  : args.has("--cli")
    ? "cli"
    : process.platform === "linux"
      ? "cli"
      : "app";

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: node install.mjs [--app | --cli] [--deps-only] [--dry-run]

  --app      Open the local plugin page in Codex (macOS and Windows)
  --cli      Register the marketplace and install the plugin with Codex CLI
  --deps-only Install only the pinned MCP runtime dependencies
  --dry-run  Validate and print actions without changing Codex configuration

The default is --app on macOS/Windows and --cli on Linux.`);
  process.exit(0);
}

function supportedNodeVersion() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return (
    (major === 20 && minor >= 19) ||
    (major === 22 && minor >= 12) ||
    major >= 23
  );
}

function run(command, commandArgs, options = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${command} ${commandArgs.map(quote).join(" ")}`);
    return { status: 0, stdout: "", stderr: "" };
  }

  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(
      `Could not run "${command}". Make sure it is installed and available in PATH.\n${result.error.message}`,
    );
  }
  if (result.status !== 0 && !options.allowFailure) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with exit code ${result.status}${details ? `:\n${details}` : ""}`,
    );
  }
  return result;
}

function quote(value) {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function normalizeForComparison(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

async function validateDistribution() {
  if (!supportedNodeVersion()) {
    throw new Error(
      `Node.js ${process.versions.node} is not supported. Install Node.js 20.19+, 22.12+, or 23+.`,
    );
  }
  await Promise.all([
    access(marketplaceFile, constants.R_OK),
    access(pluginManifest, constants.R_OK),
    access(runtimePackage, constants.R_OK),
    access(runtimeLock, constants.R_OK),
  ]);

  const marketplace = JSON.parse(await readFile(marketplaceFile, "utf8"));
  const manifest = JSON.parse(await readFile(pluginManifest, "utf8"));
  const entry = marketplace.plugins?.find(
    (plugin) => plugin.name === manifest.name,
  );
  if (!marketplace.name || !entry) {
    throw new Error("The local marketplace does not contain the plugin manifest.");
  }
  return { marketplace, manifest };
}

async function ensureRuntimeDependencies() {
  if (process.env.CODEX_TEST_SKIP_RUNTIME_INSTALL === "1") return;
  try {
    await access(runtimeEntryPoint, constants.R_OK);
    console.log("MCP runtime dependencies are already installed.");
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  console.log("Installing pinned MCP runtime dependencies with npm ci...");
  run(
    process.env.NPM_BIN || (process.platform === "win32" ? "npm.cmd" : "npm"),
    ["ci", "--omit=dev", "--no-audit", "--no-fund"],
    { cwd: runtimeRoot },
  );
  if (!dryRun) {
    await access(runtimeEntryPoint, constants.R_OK);
    console.log("MCP runtime dependencies installed.");
  }
}

async function installForCli(marketplace, manifest) {
  let marketplaces = [];
  if (!dryRun) {
    const listResult = run(
      process.env.CODEX_BIN || "codex",
      ["plugin", "marketplace", "list", "--json"],
      { capture: true },
    );
    const parsed = JSON.parse(listResult.stdout);
    marketplaces = parsed.marketplaces ?? [];
  }

  const sameName = marketplaces.find(
    (candidate) => candidate.name === marketplace.name,
  );
  const sameRoot = marketplaces.find(
    (candidate) =>
      candidate.root &&
      normalizeForComparison(candidate.root) ===
        normalizeForComparison(distributionRoot),
  );

  if (
    sameName &&
    normalizeForComparison(sameName.root) !==
      normalizeForComparison(distributionRoot)
  ) {
    throw new Error(
      `Marketplace "${marketplace.name}" already points to:\n${sameName.root}\nRemove that source explicitly or rename this marketplace before installing.`,
    );
  }

  if (sameRoot && !sameName) {
    throw new Error(
      `This marketplace root is already registered as "${sameRoot.name}", but its manifest name is "${marketplace.name}". Remove the stale marketplace entry explicitly and run the installer again.`,
    );
  }

  if (!sameName) {
    run(process.env.CODEX_BIN || "codex", [
      "plugin",
      "marketplace",
      "add",
      distributionRoot,
    ]);
  } else {
    console.log(`Marketplace "${marketplace.name}" is already registered.`);
  }

  run(process.env.CODEX_BIN || "codex", [
    "plugin",
    "add",
    `${manifest.name}@${marketplace.name}`,
  ]);
  console.log(
    `Chrome DevTools installed for Codex CLI. Start a new Codex task to load it.`,
  );
}

function openInCodex(manifest) {
  const url =
    `codex://plugins/${encodeURIComponent(manifest.name)}` +
    `?marketplacePath=${encodeURIComponent(marketplaceFile)}`;

  if (dryRun) {
    console.log(`[dry-run] Open ${url}`);
    return;
  }
  if (process.platform === "darwin") {
    run("open", [url]);
  } else if (process.platform === "win32") {
    run("cmd.exe", ["/d", "/s", "/c", `start "" "${url}"`]);
  } else {
    throw new Error(
      "Codex desktop installation is supported on macOS and Windows. Use --cli on Linux.",
    );
  }
  console.log("Codex opened. Choose Install/Enable on the plugin page.");
}

try {
  const { marketplace, manifest } = await validateDistribution();
  await ensureRuntimeDependencies();
  if (dependenciesOnly) {
    console.log("MCP runtime is ready.");
  } else if (mode === "cli") {
    await installForCli(marketplace, manifest);
  } else {
    openInCodex(manifest);
  }
} catch (error) {
  console.error(`Installation failed: ${error.message}`);
  process.exitCode = 1;
}
