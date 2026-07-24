#!/usr/bin/env node

import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const userHome = homedir();
const configPath = path.join(userHome, ".config", "opencode", "opencode.json");
const runtimeTarget = path.join(userHome, ".local", "share", "opencode", "chrome-devtools");
const skillTarget = path.join(userHome, ".config", "opencode", "skills", "devtools");
const existingConfig = await readFile(configPath, "utf8");
const config = JSON.parse(existingConfig);

if (config.mcp?.devtools) {
  delete config.mcp.devtools;
  if (Object.keys(config.mcp).length === 0) delete config.mcp;
  const backupPath = `${configPath}.backup-${Date.now()}`;
  await writeFile(backupPath, existingConfig);
  const temporaryConfig = `${configPath}.tmp-${process.pid}`;
  await writeFile(temporaryConfig, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporaryConfig, configPath);
  console.log(`Config backup: ${backupPath}`);
}

await rm(runtimeTarget, { recursive: true, force: true });
await rm(skillTarget, { recursive: true, force: true });
console.log("Chrome DevTools runtime and skill removed.");

