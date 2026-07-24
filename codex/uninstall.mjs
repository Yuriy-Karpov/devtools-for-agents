#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import path from "node:path";

const distributionRoot = path.dirname(fileURLToPath(import.meta.url));
const marketplaceFile = path.join(
  distributionRoot,
  ".agents",
  "plugins",
  "marketplace.json",
);
const pluginManifest = path.join(
  distributionRoot,
  "plugins",
  "chrome-devtools",
  ".codex-plugin",
  "plugin.json",
);
const runtimeDependencies = path.join(
  distributionRoot,
  "plugins",
  "chrome-devtools",
  "mcp",
  "chrome-devtools-mcp-runtime",
  "node_modules",
);
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const keepMarketplace = args.has("--keep-marketplace");
const keepDependencies = args.has("--keep-deps");

function resolveCodexCommand() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;

  const executable = process.platform === "win32" ? "codex.exe" : "codex";
  const candidates = [
    process.env.CODEX_INSTALL_DIR &&
      path.join(process.env.CODEX_INSTALL_DIR, executable),
  ];
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Codex.app/Contents/Resources/codex",
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      "/Applications/Ai/Codex.app/Contents/Resources/codex",
      "/Applications/Ai/ChatGPT.app/Contents/Resources/codex",
      path.join(homedir(), "Applications", "Codex.app", "Contents", "Resources", "codex"),
    );
  } else if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(
      path.join(
        process.env.LOCALAPPDATA,
        "Programs",
        "OpenAI",
        "Codex",
        "bin",
        "codex.exe",
      ),
    );
  }
  return candidates.filter(Boolean).find(existsSync) || executable;
}

const codex = resolveCodexCommand();

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: node uninstall.mjs [options]

  --keep-marketplace  Keep the local marketplace registered in Codex
  --keep-deps         Keep the generated MCP node_modules directory
  --dry-run           Print actions without changing Codex or local files

Browser selection and repository sources are always preserved.`);
  process.exit(0);
}

function normalizeForComparison(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function run(commandArgs, options = {}) {
  if (dryRun && !options.capture) {
    console.log(`[dry-run] ${codex} ${commandArgs.join(" ")}`);
    return { status: 0, stdout: "", stderr: "" };
  }
  const result = spawnSync(codex, commandArgs, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(
      `Could not run "${codex}". Install Codex CLI or set CODEX_BIN to its executable path.\n${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(
      `${codex} ${commandArgs.join(" ")} failed with exit code ${result.status}${details ? `:\n${details}` : ""}`,
    );
  }
  return result;
}

function readJson(commandArgs) {
  const result = run(commandArgs, { capture: true });
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `${codex} ${commandArgs.join(" ")} did not return valid JSON.`,
    );
  }
}

async function removeDependencies() {
  if (keepDependencies) {
    console.log("MCP runtime dependencies were kept.");
    return;
  }
  try {
    await access(runtimeDependencies, constants.F_OK);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("MCP runtime dependencies are already absent.");
      return;
    }
    throw error;
  }

  if (dryRun) {
    console.log(`[dry-run] Remove ${runtimeDependencies}`);
  } else {
    await rm(runtimeDependencies, { recursive: true, force: true });
    console.log("Removed generated MCP runtime dependencies.");
  }
}

try {
  const marketplace = JSON.parse(await readFile(marketplaceFile, "utf8"));
  const manifest = JSON.parse(await readFile(pluginManifest, "utf8"));
  const selector = `${manifest.name}@${marketplace.name}`;

  const marketplaceList = readJson([
    "plugin",
    "marketplace",
    "list",
    "--json",
  ]);
  const registeredMarketplace = marketplaceList.marketplaces?.find(
    (candidate) => candidate.name === marketplace.name,
  );

  if (
    registeredMarketplace?.root &&
    normalizeForComparison(registeredMarketplace.root) !==
      normalizeForComparison(distributionRoot)
  ) {
    throw new Error(
      `Refusing to uninstall: marketplace "${marketplace.name}" points to another directory:\n${registeredMarketplace.root}`,
    );
  }

  const pluginList = readJson(["plugin", "list", "--json"]);
  const installedPlugin = pluginList.installed?.find(
    (plugin) => plugin.pluginId === selector,
  );
  if (installedPlugin) {
    const installedMarketplaceRoot =
      installedPlugin.marketplaceSource?.source;
    if (
      installedMarketplaceRoot &&
      normalizeForComparison(installedMarketplaceRoot) !==
        normalizeForComparison(distributionRoot)
    ) {
      throw new Error(
        `Refusing to uninstall: ${selector} was installed from another directory:\n${installedMarketplaceRoot}`,
      );
    }
    run(["plugin", "remove", selector]);
    console.log(`Removed ${selector} from Codex.`);
  } else {
    console.log(`${selector} is not installed.`);
  }

  if (keepMarketplace) {
    console.log(`Marketplace "${marketplace.name}" was kept.`);
  } else if (registeredMarketplace) {
    run(["plugin", "marketplace", "remove", marketplace.name]);
    console.log(`Removed marketplace "${marketplace.name}" from Codex.`);
  } else {
    console.log(`Marketplace "${marketplace.name}" is not registered.`);
  }

  await removeDependencies();
  console.log(
    dryRun
      ? "Dry run complete. No Codex or local state was changed."
      : "Uninstall complete. Repository sources and browser configuration were preserved.",
  );
} catch (error) {
  console.error(`Uninstall failed: ${error.message}`);
  process.exitCode = 1;
}
