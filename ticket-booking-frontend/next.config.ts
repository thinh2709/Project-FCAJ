import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Re-enabled static export to host on S3 + CloudFront
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
