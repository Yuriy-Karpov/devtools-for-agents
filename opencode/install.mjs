#!/usr/bin/env node

import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const userHome = homedir();
const configDirectory = path.join(userHome, ".config", "opencode");
const configPath = path.join(configDirectory, "opencode.json");
const runtimeTarget = path.join(userHome, ".local", "share", "opencode", "chrome-devtools");
const skillTarget = path.join(configDirectory, "skills", "devtools");
let config = {};
let existingConfig;

try {
  existingConfig = await readFile(configPath, "utf8");
  config = JSON.parse(existingConfig);
} catch (error) {
  if (error.code !== "ENOENT") {
    console.error(`Cannot parse ${configPath} as JSON. Merge mcp.devtools manually.`);
    process.exit(1);
  }
}

config.mcp ??= {};
config.mcp.devtools = {
  type: "local",
  command: [
    "node",
    path.join(runtimeTarget, "run-chrome-devtools-mcp.mjs"),
    "--no-usage-statistics",
    "--no-performance-crux",
  ],
  enabled: true,
  environment: {
    CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: "1",
    CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: "1",
  },
  timeout: 30000,
};

await mkdir(configDirectory, { recursive: true });
if (existingConfig !== undefined) {
  const backupPath = `${configPath}.backup-${Date.now()}`;
  await writeFile(backupPath, existingConfig);
  console.log(`Config backup: ${backupPath}`);
}
await cp(path.join(sourceRoot, "mcp", "chrome-devtools-mcp-runtime"), runtimeTarget, {
  recursive: true,
  force: true,
});
await cp(path.join(sourceRoot, ".opencode", "skills", "devtools"), skillTarget, {
  recursive: true,
  force: true,
});
const temporaryConfig = `${configPath}.tmp-${process.pid}`;
await writeFile(temporaryConfig, `${JSON.stringify(config, null, 2)}\n`);
await rename(temporaryConfig, configPath);

console.log(`Runtime installed: ${runtimeTarget}`);
console.log(`Skill installed: ${skillTarget}`);
console.log("Restart OpenCode to load devtools.");

