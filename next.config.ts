import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization for D-ID avatars and character images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.d-id.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Experimental features for better performance
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "10mb", // For PDF uploads
    },
  },

  // Headers for PWA and cross-origin isolation
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
