import fs from "node:fs/promises";
import path from "node:path";
import { getPrismaClient } from "./prisma.js";
import { defaultSettings, mergeSettings } from "./settings-defaults.js";
import { getDefaultWorkspaceRecord } from "./workspace-store.js";
import type { Settings, SettingsUpdate } from "../types.js";
import type { Prisma, PrismaClient } from "@prisma/client";

export { defaultSettings, mergeSettings } from "./settings-defaults.js";

interface StorePaths {
  outputRoot: string;
  settingsPath: string;
  uploadDir: string;
}

export async function getSettings(): Promise<Settings> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      return await getSettingsFromDatabase();
    } catch {
      return getSettingsFromFile();
    }
  }

  return getSettingsFromFile();
}

export async function saveSettings(nextSettings: SettingsUpdate): Promise<Settings> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      return await saveSettingsToDatabase(prisma, nextSettings);
    } catch {
      return saveSettingsToFile(nextSettings);
    }
  }

  return saveSettingsToFile(nextSettings);
}

export function getUploadDirectory(): string {
  return getStorePaths().uploadDir;
}

async function getSettingsFromFile(): Promise<Settings> {
  await ensureOutputLayout();
  const { settingsPath } = getStorePaths();

  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return mergeSettings(JSON.parse(raw) as SettingsUpdate);
  } catch {
    const defaults = defaultSettings();
    await saveSettings(defaults);
    return defaults;
  }
}

async function saveSettingsToFile(nextSettings: SettingsUpdate): Promise<Settings> {
  await ensureOutputLayout();
  const { settingsPath } = getStorePaths();
  const merged = mergeSettings(nextSettings);
  await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

async function ensureOutputLayout(): Promise<void> {
  const { outputRoot, uploadDir } = getStorePaths();
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
}

function getStorePaths(): StorePaths {
  const outputRoot = process.env.SCOUTCLAW_OUTPUT_DIR
    ? path.resolve(process.env.SCOUTCLAW_OUTPUT_DIR)
    : path.join(process.cwd(), "output");

  return {
    outputRoot,
    settingsPath: path.join(outputRoot, "scoutclaw-settings.json"),
    uploadDir: path.join(outputRoot, "uploads")
  };
}

async function getSettingsFromDatabase(): Promise<Settings> {
  const record = await getDefaultWorkspaceRecord();

  if (!record) {
    return getSettingsFromFile();
  }

  return mergeSettings(record.workspace.settings as unknown as SettingsUpdate);
}

async function saveSettingsToDatabase(prisma: PrismaClient, nextSettings: SettingsUpdate): Promise<Settings> {
  await ensureOutputLayout();
  const merged = mergeSettings(nextSettings);
  const record = await getDefaultWorkspaceRecord();

  if (!record) {
    return saveSettingsToFile(merged);
  }

  await prisma.workspace.update({
    where: { id: record.workspace.id },
    data: {
      mode: merged.mode === "hire" ? "HIRE" : merged.mode === "get_hired" ? "GET_HIRED" : null,
      settings: merged as unknown as Prisma.InputJsonValue
    }
  });

  return merged;
}
