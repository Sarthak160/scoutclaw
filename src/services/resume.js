import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export async function extractResumeInsights(resumePath) {
  if (!resumePath) {
    return emptyResumeInsights();
  }

  try {
    const data = await fs.readFile(resumePath);
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data });
    const result = await parser.getText();
    await parser.destroy();

    const normalizedText = normalizeWhitespace(result.text);
    return {
      excerpt: normalizedText.slice(0, 4000),
      searchSignals: deriveSearchSignals(normalizedText)
    };
  } catch {
    return emptyResumeInsights();
  }
}

function emptyResumeInsights() {
  return {
    excerpt: "",
    searchSignals: []
  };
}

function normalizeWhitespace(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function deriveSearchSignals(text) {
  const signals = [];
  const lowerText = text.toLowerCase();
  const rules = [
    [/golang| go /i, "golang"],
    [/\bjava\b/i, "java"],
    [/\bpython\b/i, "python"],
    [/\bjavascript\b|\bnode\.?js\b/i, "nodejs"],
    [/\btypescript\b/i, "typescript"],
    [/\breact\b/i, "react"],
    [/\bnext\.?js\b/i, "nextjs"],
    [/\baws\b|amazon web services/i, "aws"],
    [/\bgcp\b|google cloud/i, "gcp"],
    [/\bazure\b/i, "azure"],
    [/\bdocker\b/i, "docker"],
    [/\bkubernetes\b|\bk8s\b/i, "kubernetes"],
    [/\bpostgres(?:ql)?\b/i, "postgresql"],
    [/\bmysql\b/i, "mysql"],
    [/\bmongodb\b/i, "mongodb"],
    [/\bredis\b/i, "redis"],
    [/\bgraphql\b/i, "graphql"],
    [/\bgrpc\b/i, "grpc"],
    [/\bmicroservices?\b/i, "microservices"],
    [/\bdistributed systems?\b/i, "distributed systems"],
    [/\bbackend\b/i, "backend"],
    [/\bfull[\s-]?stack\b/i, "full stack"],
    [/\bsde[\s-]?2\b|\bsoftware engineer ii\b/i, "sde2"],
    [/\bsenior software engineer\b/i, "senior software engineer"]
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(lowerText)) {
      signals.push(label);
    }
  }

  return signals.slice(0, 12);
}
