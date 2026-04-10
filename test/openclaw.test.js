import test from "node:test";
import assert from "node:assert/strict";

import { splitCommand, __testables } from "../src/openclaw.js";

test("splitCommand handles quoted args", () => {
  const parsed = splitCommand('openclaw --profile "work mode"');
  assert.equal(parsed.command, "openclaw");
  assert.deepEqual(parsed.args, ["--profile", "work mode"]);
});

test("gateway helpers detect healthy and missing modes", () => {
  assert.equal(__testables.gatewayLooksHealthy("Runtime: running"), true);
  assert.equal(__testables.gatewayLooksHealthy("nothing useful"), false);
  assert.equal(__testables.isGatewayModeMissing({ gateway: {} }), true);
  assert.equal(__testables.isGatewayModeMissing({ gateway: { mode: "local" } }), false);
});
