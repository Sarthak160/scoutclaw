import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function ensureOpenClawReady({ command, commandArgs, profileArgs, workspace }) {
  const configPath = resolveConfigPath();
  const config = await readConfig(configPath);
  const configExists = config !== null;
  const existingState = await hasExistingState();
  const allowUnconfigured = !configExists || isGatewayModeMissing(config);

  if (!configExists && !existingState) {
    console.log("OpenClaw is not configured yet. Starting onboarding...");
    await runInteractive(command, [...commandArgs, ...profileArgs, "onboard"], { cwd: workspace });
  }

  const gatewayStatus = await runCapture(command, [...commandArgs, ...profileArgs, "gateway", "status"], {
    cwd: workspace
  });

  if (!gatewayLooksHealthy(gatewayStatus.stdout)) {
    console.log("OpenClaw Gateway is not running. Starting it now...");
    const gatewayArgs = [
      ...commandArgs,
      ...profileArgs,
      "gateway",
      ...(allowUnconfigured ? ["--allow-unconfigured"] : []),
      "run"
    ];
    const gateway = spawn(command, gatewayArgs, {
      cwd: workspace,
      detached: true,
      stdio: "ignore",
      env: process.env
    });
    gateway.unref();

    await waitForGateway(command, commandArgs, profileArgs, workspace);
  }
}

export function splitCommand(value) {
  const parts = String(value)
    .trim()
    .match(/(?:[^\s"]+|"[^"]*")+/g);

  if (!parts || parts.length === 0) {
    throw new Error("Missing open-claw command. Set OPEN_CLAW_CMD or pass --open-claw-cmd.");
  }

  const [command, ...args] = parts.map((part) => part.replace(/^"(.*)"$/, "$1"));
  return { command, args };
}

export function spawnTuiSession({
  command,
  commandArgs,
  profileArgs,
  session,
  prompt,
  forwardedArgs,
  gatewayToken,
  gatewayPassword,
  workspace
}) {
  return spawn(
    command,
    [
      ...commandArgs,
      ...profileArgs,
      "tui",
      "--session",
      session,
      "--message",
      prompt,
      ...forwardedArgs,
      ...(gatewayToken ? ["--token", gatewayToken] : []),
      ...(gatewayPassword ? ["--password", gatewayPassword] : [])
    ],
    {
      cwd: workspace,
      stdio: "inherit",
      env: process.env
    }
  );
}

export const __testables = {
  gatewayLooksHealthy,
  isGatewayModeMissing
};

function resolveConfigPath() {
  if (process.env.OPENCLAW_CONFIG_PATH) {
    return process.env.OPENCLAW_CONFIG_PATH;
  }

  if (process.env.OPENCLAW_HOME) {
    return path.join(process.env.OPENCLAW_HOME, "openclaw.json");
  }

  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readConfig(configPath) {
  if (!(await pathExists(configPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function hasExistingState() {
  const stateRoot = process.env.OPENCLAW_HOME || path.join(os.homedir(), ".openclaw");

  try {
    const entries = await fs.readdir(stateRoot);
    const meaningfulEntries = entries.filter((entry) => !entry.startsWith("."));
    return meaningfulEntries.length > 0;
  } catch {
    return false;
  }
}

async function runCapture(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function runInteractive(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if ((code ?? 0) === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

function gatewayLooksHealthy(output) {
  return output.includes("Runtime: running") || output.includes("RPC probe: ok");
}

function isGatewayModeMissing(config) {
  if (!config || typeof config !== "object") {
    return false;
  }

  const gateway = config.gateway;
  if (!gateway || typeof gateway !== "object") {
    return true;
  }

  return typeof gateway.mode !== "string" || gateway.mode.trim() === "";
}

async function waitForGateway(command, commandArgs, profileArgs, workspace) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await delay(1000);
    const status = await runCapture(command, [...commandArgs, ...profileArgs, "gateway", "status"], {
      cwd: workspace
    });
    if (gatewayLooksHealthy(status.stdout)) {
      return;
    }
  }

  throw new Error("OpenClaw Gateway did not become ready. Try running `openclaw gateway` manually once.");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
