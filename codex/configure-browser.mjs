#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { homedir } from "node:os";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const showOnly = rawArgs.includes("--show");
const auto = rawArgs.includes("--auto");
const positionalPath = rawArgs.find((argument) => !argument.startsWith("--"));

function configurationPath() {
  if (process.env.CHROME_DEVTOOLS_BROWSER_PATH_FILE) {
    return path.resolve(process.env.CHROME_DEVTOOLS_BROWSER_PATH_FILE);
  }
  if (process.platform === "win32") {
    const base =
      process.env.LOCALAPPDATA ||
      process.env.APPDATA ||
      path.join(homedir(), "AppData", "Local");
    return path.join(base, "chrome-devtools-mcp", "browser-path");
  }
  const base =
    process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
  return path.join(base, "chrome-devtools-mcp", "browser-path");
}

function windowsCandidates() {
  const roots = [
    process.env.PROGRAMFILES,
    process.env["PROGRAMFILES(X86)"],
    process.env.LOCALAPPDATA,
  ].filter(Boolean);
  const relativePaths = [
    ["Google", "Chrome", "Application", "chrome.exe"],
    ["Chromium", "Application", "chrome.exe"],
    ["Microsoft", "Edge", "Application", "msedge.exe"],
    ["Yandex", "YandexBrowser", "Application", "browser.exe"],
  ];
  return roots.flatMap((root) =>
    relativePaths.map((relative) => path.join(root, ...relative)),
  );
}

function macCandidates() {
  return [
    "/Applications/Google Chrome.app",
    "/Applications/Chromium.app",
    "/Applications/Microsoft Edge.app",
    "/Applications/Yandex.app",
    path.join(homedir(), "Applications", "Google Chrome.app"),
  ];
}

function linuxCandidates() {
  const names = [
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "microsoft-edge-stable",
    "yandex-browser",
  ];
  return names.flatMap((name) => {
    try {
      const resolved = execFileSync("sh", ["-c", `command -v "${name}"`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      return resolved ? [resolved] : [];
    } catch {
      return [];
    }
  });
}

async function existingCandidates() {
  const candidates =
    process.platform === "win32"
      ? windowsCandidates()
      : process.platform === "darwin"
        ? macCandidates()
        : linuxCandidates();
  const unique = [...new Set(candidates)];
  const existing = [];
  for (const candidate of unique) {
    try {
      await access(candidate, constants.R_OK);
      existing.push(candidate);
    } catch {
      // Candidate is not installed.
    }
  }
  return existing;
}

async function validateBrowserPath(browserPath) {
  const info = await stat(browserPath);
  if (info.isDirectory() && process.platform !== "darwin") {
    throw new Error(`Expected a browser executable, but got a directory: ${browserPath}`);
  }
  const mode = process.platform === "win32" ? constants.R_OK : constants.X_OK;
  await access(browserPath, info.isDirectory() ? constants.R_OK : mode);
}

async function chooseBrowser() {
  if (positionalPath) return path.resolve(positionalPath);

  const candidates = await existingCandidates();
  if (auto) {
    if (!candidates.length) {
      throw new Error(
        "No supported Chromium browser was detected. Pass its executable path explicitly.",
      );
    }
    return candidates[0];
  }

  if (!input.isTTY || !output.isTTY) {
    throw new Error(
      "Interactive input is unavailable. Pass a browser path or use --auto.",
    );
  }

  console.log("Detected Chromium browsers:");
  candidates.forEach((candidate, index) =>
    console.log(`  ${index + 1}. ${candidate}`),
  );
  console.log(`  ${candidates.length + 1}. Enter another path`);

  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question("Select a browser: ");
    const selection = Number(answer);
    if (
      Number.isInteger(selection) &&
      selection >= 1 &&
      selection <= candidates.length
    ) {
      return candidates[selection - 1];
    }
    return path.resolve(
      await prompt.question("Browser executable (or .app) path: "),
    );
  } finally {
    prompt.close();
  }
}

try {
  const configFile = configurationPath();
  if (showOnly) {
    try {
      console.log((await readFile(configFile, "utf8")).trim());
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      console.log("No browser is configured.");
    }
  } else {
    const browserPath = await chooseBrowser();
    await validateBrowserPath(browserPath);
    await mkdir(path.dirname(configFile), { recursive: true });
    await writeFile(configFile, `${browserPath}\n`, "utf8");
    console.log(`Browser configured: ${browserPath}`);
    console.log(`Configuration file: ${configFile}`);
    console.log("Restart Codex and start a new task to apply the setting.");
  }
} catch (error) {
  console.error(`Browser configuration failed: ${error.message}`);
  process.exitCode = 1;
}
