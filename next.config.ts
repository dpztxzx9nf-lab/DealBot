import type { NextConfig } from "next";

/** Hostnames only (no scheme). Comma-separated in ALLOWED_DEV_ORIGIN. */
function getAllowedDevOrigins(): string[] {
  const fromEnv = [
    process.env.ALLOWED_DEV_ORIGIN,
    process.env.DEALBOT_PUBLIC_HOSTNAME,
  ]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((s) =>
      s
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")
    )
    .filter(Boolean);

  return [
    ...fromEnv,
    "*.trycloudflare.com",
    "*.cfargotunnel.com",
  ];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "preview.redd.it",
      },
      {
        protocol: "https",
        hostname: "i.redd.it",
      },
      {
        protocol: "https",
        hostname: "external-preview.redd.it",
      },
    ],
  },
};

export default nextConfig;
