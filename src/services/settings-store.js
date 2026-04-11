import fs from "node:fs/promises";
import path from "node:path";
import { getPrismaClient } from "./prisma.js";
import { defaultSettings, mergeSettings } from "./settings-defaults.js";
import { getDefaultWorkspaceRecord } from "./workspace-store.js";

export { defaultSettings, mergeSettings } from "./settings-defaults.js";

export async function getSettings() {
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

export async function saveSettings(nextSettings) {
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

export function getUploadDirectory() {
  return getStorePaths().uploadDir;
}

async function getSettingsFromFile() {
  await ensureOutputLayout();
  const { settingsPath } = getStorePaths();

  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return mergeSettings(JSON.parse(raw));
  } catch {
    const defaults = defaultSettings();
    await saveSettings(defaults);
    return defaults;
  }
}

async function saveSettingsToFile(nextSettings) {
  await ensureOutputLayout();
  const { settingsPath } = getStorePaths();
  const merged = mergeSettings(nextSettings);
  await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

async function ensureOutputLayout() {
  const { outputRoot, uploadDir } = getStorePaths();
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
}

function getStorePaths() {
  const outputRoot = process.env.SCOUTCLAW_OUTPUT_DIR
    ? path.resolve(process.env.SCOUTCLAW_OUTPUT_DIR)
    : path.join(process.cwd(), "output");

  return {
    outputRoot,
    settingsPath: path.join(outputRoot, "scoutclaw-settings.json"),
    uploadDir: path.join(outputRoot, "uploads")
  };
}

async function getSettingsFromDatabase() {
  const record = await getDefaultWorkspaceRecord();

  if (!record) {
    return getSettingsFromFile();
  }

  return mergeSettings(record.workspace.settings);
}

async function saveSettingsToDatabase(prisma, nextSettings) {
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
      settings: merged
    }
  });

  return merged;
}
