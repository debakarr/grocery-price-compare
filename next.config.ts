import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright', 'cheerio'],
};

export default nextConfig;
