import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Re-enabled static export to host on S3 + CloudFront
  trailingSlash: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;

