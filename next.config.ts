// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/staking",
  assetPrefix: "/staking",
  trailingSlash: true,
  // Externalize packages that should not be bundled on the server
  serverExternalPackages: [
    "@walletconnect/ethereum-provider",
    "@reown/appkit",
    "@reown/appkit-utils",
    "@walletconnect/logger",
    "pino",
    "thread-stream",
  ],

  turbopack: {},
};

export default nextConfig;
