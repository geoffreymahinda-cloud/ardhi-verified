import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/escrow", destination: "/how-it-works", permanent: true },
      { source: "/escrow/:path*", destination: "/how-it-works", permanent: true },
      { source: "/escrow-policy", destination: "/how-it-works", permanent: true },
      { source: "/saccos", destination: "/partners", permanent: true },
      { source: "/saccos/:slug", destination: "/partners/:slug", permanent: true },
      // Old single-partner dashboard is superseded by the new partner portal
      { source: "/partner", destination: "/partners/portal", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
