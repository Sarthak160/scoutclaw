import test from "node:test";
import assert from "node:assert/strict";

import { extractJobUrlInsights, __testables } from "../src/services/job-url-insights.js";

test("extractJobUrlInsights derives metadata and signals from a job page", async () => {
  const html = `
    <html>
      <head>
        <title>Senior Golang Engineer</title>
        <meta name="description" content="Backend role with Kubernetes and Redis ownership">
      </head>
      <body>
        <script>ignoreThis("python")</script>
        We need distributed systems experience, GraphQL APIs, and Docker.
      </body>
    </html>
  `;

  const insights = await extractJobUrlInsights("https://example.com/jobs/1", {
    fetchImpl: async () => ({
      ok: true,
      text: async () => html
    })
  });

  assert.match(insights.excerpt, /Senior Golang Engineer/);
  assert.match(insights.excerpt, /Backend role/);
  assert.deepEqual(insights.searchSignals, [
    "golang",
    "docker",
    "kubernetes",
    "redis",
    "graphql",
    "distributed systems",
    "backend"
  ]);
});

test("job URL helpers strip scripts and normalize HTML", () => {
  const text = __testables.stripHtml("<h1>A&amp;B</h1><script>secret</script><p>C</p>");
  assert.equal(text, "A&B C");
});
