#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const runtimeRoot = path.dirname(fileURLToPath(import.meta.url));
const entryPoint = path.join(
  runtimeRoot,
  "node_modules",
  "chrome-devtools-mcp",
  "build",
  "src",
  "bin",
  "chrome-devtools-mcp.js",
);
const serverArgs = process.argv.slice(2);
const platformVariable = {
  darwin: "CHROME_DEVTOOLS_BROWSER_PATH_MAC",
  linux: "CHROME_DEVTOOLS_BROWSER_PATH_LINUX",
  win32: "CHROME_DEVTOOLS_BROWSER_PATH_WINDOWS",
}[process.platform];
const platformConfigRoot =
  process.platform === "win32"
    ? process.env.LOCALAPPDATA ||
      process.env.APPDATA ||
      path.join(homedir(), "AppData", "Local")
    : process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
const browserConfigPath =
  process.env.CHROME_DEVTOOLS_BROWSER_PATH_FILE ||
  path.join(platformConfigRoot, "chrome-devtools-mcp", "browser-path");
let configuredBrowserPath;
try {
  configuredBrowserPath = (await readFile(browserConfigPath, "utf8")).trim();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const browserPath =
  process.env.CHROME_DEVTOOLS_BROWSER_PATH ||
  (platformVariable && process.env[platformVariable]) ||
  configuredBrowserPath;
const hasExplicitConnection = serverArgs.some(
  (argument) =>
    argument.startsWith("--executablePath") ||
    argument.startsWith("--executable-path") ||
    argument.startsWith("--browserUrl") ||
    argument.startsWith("--browser-url") ||
    argument.startsWith("--wsEndpoint") ||
    argument.startsWith("--ws-endpoint") ||
    argument === "--autoConnect" ||
    argument === "--auto-connect",
);

await access(entryPoint, constants.R_OK);

if (browserPath && !hasExplicitConnection) {
  let executablePath = browserPath;
  const browserStat = await stat(browserPath);

  if (browserStat.isDirectory() && browserPath.endsWith(".app")) {
    const macOsDirectory = path.join(browserPath, "Contents", "MacOS");
    const candidates = await readdir(macOsDirectory);
    let executable;
    for (const candidate of candidates) {
      try {
        await access(path.join(macOsDirectory, candidate), constants.X_OK);
        executable = candidate;
        break;
      } catch {
        // Continue until an executable file is found.
      }
    }
    if (!executable) {
      throw new Error(`No browser executable found in ${macOsDirectory}`);
    }
    executablePath = path.join(macOsDirectory, executable);
  }

  await access(
    executablePath,
    process.platform === "win32" ? constants.R_OK : constants.X_OK,
  );
  serverArgs.push(`--executablePath=${executablePath}`);
}

const child = spawn(process.execPath, [entryPoint, ...serverArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: "1",
    CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: "1",
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`Failed to start Chrome DevTools MCP: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
