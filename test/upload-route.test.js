import test from "node:test";
import assert from "node:assert/strict";

import { createUploadResponse } from "../app/api/upload/route.js";

test("upload rejects missing resume file", async () => {
  const formData = new FormData();
  const request = {
    formData: async () => formData
  };

  const response = await createUploadResponse(request);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Missing resume file." });
});

test("upload writes a sanitized filename and persists resume path", async () => {
  let writtenPath = "";
  let persisted = null;

  const formData = new FormData();
  formData.set("resume", new File(["pdf-bytes"], "resume final?.pdf", { type: "application/pdf" }));

  const response = await createUploadResponse(
    { formData: async () => formData },
    {
      writeFile: async (targetPath) => {
        writtenPath = targetPath;
      },
      now: () => 123,
      getUploadDir: () => "/tmp/uploads",
      readSettings: async () => ({ applicant: {}, filters: [] }),
      persistSettings: async (value) => {
        persisted = value;
      }
    }
  );

  assert.equal(writtenPath, "/tmp/uploads/123-resume-final-.pdf");
  assert.equal(persisted.resumePath, "/tmp/uploads/123-resume-final-.pdf");
  assert.deepEqual(await response.json(), { ok: true, resumePath: "/tmp/uploads/123-resume-final-.pdf" });
});
