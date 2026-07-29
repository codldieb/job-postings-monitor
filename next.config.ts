import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cheerio", "playwright", "pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
