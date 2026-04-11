import { deriveSearchSignals, normalizeWhitespace } from "./resume.js";

const MAX_HTML_CHARS = 500000;

export async function extractJobUrlInsights(jobOpeningUrl, { fetchImpl = fetch } = {}) {
  if (!jobOpeningUrl) {
    return emptyJobUrlInsights();
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(jobOpeningUrl);
  } catch {
    return emptyJobUrlInsights();
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return emptyJobUrlInsights();
  }

  try {
    const response = await fetchImpl(parsedUrl.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "user-agent": "ScoutClaw/0.1 (+https://scoutclaw.local)"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return emptyJobUrlInsights();
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    const metadata = extractHtmlMetadata(html);
    const combinedText = normalizeWhitespace(
      [metadata.title, metadata.description, metadata.body].filter(Boolean).join(" ")
    );

    return {
      excerpt: combinedText.slice(0, 4000),
      searchSignals: deriveSearchSignals(combinedText)
    };
  } catch {
    return emptyJobUrlInsights();
  }
}

export const __testables = {
  extractHtmlMetadata,
  stripHtml
};

function emptyJobUrlInsights() {
  return {
    excerpt: "",
    searchSignals: []
  };
}

function extractHtmlMetadata(html) {
  const title = decodeHtmlEntities(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decodeHtmlEntities(
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      matchFirst(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
  );

  return {
    title: normalizeWhitespace(title),
    description: normalizeWhitespace(description),
    body: stripHtml(html)
  };
}

function stripHtml(html) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function matchFirst(text, pattern) {
  return pattern.exec(text)?.[1] || "";
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
