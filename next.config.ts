import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets phones on the same Wi-Fi load dev assets via the laptop IP.
  allowedDevOrigins: ["172.20.10.3", "192.168.*.*", "10.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
