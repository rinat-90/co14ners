import path from "path";
import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWAInit = require("@ducanh2912/next-pwa").default ?? require("@ducanh2912/next-pwa");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  fallbacks: {
    // Show /offline when a page navigation fails (user is offline)
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // ── Runtime caching strategies ────────────────────────────────────────────
    runtimeCaching: [
      // tRPC API — NetworkFirst: try network, fall back to cache (10 min TTL)
      {
        urlPattern: /\/trpc\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "trpc-api-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 10 * 60, // 10 minutes
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Open-Meteo weather + elevation — NetworkFirst with 30 min TTL
      {
        urlPattern: /^https:\/\/api\.open-meteo\.com\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "open-meteo-cache",
          networkTimeoutSeconds: 4,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 60, // 30 minutes
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Mountain photos / user avatars (base64 data URIs are inline, but external images go here)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 150,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Google Fonts / other CDN fonts
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Next.js static chunks — CacheFirst (hashed filenames change on deploy)
      {
        urlPattern: /\/_next\/static\//,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-cache",
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@co14ners/api"],
};

export default withPWA(nextConfig);
