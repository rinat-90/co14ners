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
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\/trpc\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "trpc-api-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 200, maxAgeSeconds: 600 },
        },
      },
      {
        urlPattern: /^https:\/\/api\.open-meteo\.com\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "open-meteo-cache",
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 50, maxAgeSeconds: 1800 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: { maxEntries: 150, maxAgeSeconds: 604800 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts-cache",
          expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
        },
      },
      {
        urlPattern: /\/_next\/static\//,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-cache",
          expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
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
