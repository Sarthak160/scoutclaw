import fs from "node:fs/promises";
import path from "node:path";
import { getUploadDirectory, getSettings, saveSettings } from "../../../src/services/settings-store.js";
import { recordUploadedAsset } from "../../../src/services/workspace-store.js";
import type { UploadedAssetInput } from "../../../src/services/workspace-store.js";
import type { SettingsUpdate, WorkflowMode } from "../../../src/types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only the fields of the stored settings that this route reads. */
interface UploadSettings {
  mode?: WorkflowMode;
}

interface UploadDeps {
  writeFile?: (target: string, data: Uint8Array) => Promise<unknown>;
  now?: () => number;
  getUploadDir?: () => string;
  readSettings?: () => Promise<UploadSettings>;
  persistSettings?: (next: SettingsUpdate) => Promise<unknown>;
  recordAsset?: (asset: UploadedAssetInput) => Promise<unknown>;
}

export async function POST(request: Request): Promise<Response> {
  return createUploadResponse(request);
}

export async function createUploadResponse(
  request: { formData(): Promise<FormData> },
  {
    writeFile = fs.writeFile,
    now = Date.now,
    getUploadDir = getUploadDirectory,
    readSettings = getSettings,
    persistSettings = saveSettings,
    recordAsset = recordUploadedAsset
  }: UploadDeps = {}
): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing resume file." }, { status: 400 });
  }

  const uploadDir = getUploadDir();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const targetPath = path.join(uploadDir, `${now()}-${safeName}`);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(targetPath, bytes);

  const settings = await readSettings();
  await persistSettings({
    ...settings,
    resumePath: targetPath
  });
  await recordAsset({
    path: targetPath,
    filename: safeName,
    mimeType: file.type || "",
    sizeBytes: bytes.length,
    kind: settings.mode === "hire" ? "ROLE_BRIEF" : "RESUME"
  });

  return Response.json({
    ok: true,
    resumePath: targetPath
  });
}
