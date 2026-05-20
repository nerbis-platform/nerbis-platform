import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output para Docker (imagen ~100MB en vez de ~500MB)
  output: "standalone",
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      // Desarrollo: localhost
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      // Producción: API backend
      ...(process.env.NEXT_PUBLIC_API_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.NEXT_PUBLIC_API_HOSTNAME,
              pathname: "/media/**",
            },
          ]
        : []),
      // Producción: S3/CloudFront para media
      ...(process.env.NEXT_PUBLIC_CDN_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.NEXT_PUBLIC_CDN_HOSTNAME,
              pathname: "/**",
            },
          ]
        : []),
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
};

export default nextConfig;
