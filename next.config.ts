import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  transpilePackages: [
    "@turf/boolean-point-in-polygon",
    "@turf/helpers",
    "@turf/invariant",
  ],
};

export default nextConfig;
