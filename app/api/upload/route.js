import fs from "node:fs/promises";
import path from "node:path";
import { getUploadDirectory, getSettings, saveSettings } from "../../../src/services/settings-store.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing resume file." }, { status: 400 });
  }

  const uploadDir = getUploadDirectory();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const targetPath = path.join(uploadDir, `${Date.now()}-${safeName}`);
  const bytes = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(targetPath, bytes);

  const settings = await getSettings();
  await saveSettings({
    ...settings,
    resumePath: targetPath
  });

  return Response.json({
    ok: true,
    resumePath: targetPath
  });
}
