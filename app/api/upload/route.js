import fs from "node:fs/promises";
import path from "node:path";
import { getUploadDirectory, getSettings, saveSettings } from "../../../src/services/settings-store.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  return createUploadResponse(request);
}

export async function createUploadResponse(
  request,
  { writeFile = fs.writeFile, now = Date.now, getUploadDir = getUploadDirectory, readSettings = getSettings, persistSettings = saveSettings } = {}
) {
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

  return Response.json({
    ok: true,
    resumePath: targetPath
  });
}
