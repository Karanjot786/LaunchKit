import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: COEP/COOP headers removed because E2B uses cloud sandboxes (not WebContainers)
  // E2B iframes don't work with COEP restrictions
  // If you switch back to WebContainers, re-enable these headers

  // Allow external images for logos
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
