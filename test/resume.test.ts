import test from "node:test";
import assert from "node:assert/strict";

import { extractResumeInsights, __testables } from "../src/services/resume.js";

test("extractResumeInsights falls back cleanly for missing file", async () => {
  const result = await extractResumeInsights("/definitely/missing.pdf");
  assert.deepEqual(result, { excerpt: "", searchSignals: [] });
});

test("resume helpers detect relevant search signals", () => {
  const signals = __testables.deriveSearchSignals("Senior backend engineer using Golang, AWS, Kubernetes, GraphQL");
  assert.deepEqual(signals, ["golang", "aws", "kubernetes", "graphql", "backend"]);
  assert.equal(__testables.normalizeWhitespace("a \n b\t c"), "a b c");
});
