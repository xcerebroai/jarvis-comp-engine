import type { NextConfig } from "next";

/**
 * Two build targets from one config:
 *  - Default (local dev / server deploy): normal Next.js with API routes.
 *  - GitHub Pages static export: set NEXT_PUBLIC_GITHUB_PAGES=true. Produces a
 *    fully static `out/` served under /jarvis-comp-engine. No API routes — the
 *    browser runs the analysis client-side against the mock provider.
 */
const isGithubPages = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";
const repo = "jarvis-comp-engine";

const nextConfig: NextConfig = isGithubPages
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      basePath: `/${repo}`,
      assetPrefix: `/${repo}/`,
    }
  : {};

export default nextConfig;
