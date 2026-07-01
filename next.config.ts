import type { NextConfig } from "next";

/**
 * The source uses TypeScript-flavoured ESM: relative imports keep the `.js`
 * extension even though the files on disk are `.ts`/`.tsx`. That is required so
 * the CLI can be compiled with NodeNext module resolution. Teach webpack to
 * resolve those `.js` requests to the corresponding TypeScript sources.
 */
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"]
    };
    return config;
  }
};

export default nextConfig;
