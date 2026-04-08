import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Enables smaller production images (see Dockerfile). */
  output: "standalone",
};

export default nextConfig;
