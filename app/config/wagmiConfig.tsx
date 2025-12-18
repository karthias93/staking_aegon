// wagmiConfig.tsx
"use client";

import { createConfig, http } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { network, rpc } from "./chain";

export function getWagmiConfig() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
  }

  // Check if we're on the client side
  const isClient = typeof window !== "undefined";

  return createConfig({
    chains: [network],
    transports: {
      [network.id]: http(rpc),
    },
    connectors: isClient
      ? [
          injected({ shimDisconnect: true }),
          walletConnect({
            projectId,
            metadata: {
              name: "AEGON AI",
              description: "AEGON AI dApp",
              url: "https://aegon-ai.com/",
              icons: ["https://avatars.githubusercontent.com/u/179229932"],
            },
            showQrModal: true,
          }),
          coinbaseWallet({
            appName: "AEGON AI",
            appLogoUrl: "https://avatars.githubusercontent.com/u/179229932",
          }),
        ]
      : [
          // Minimal connectors for SSR (injected is safe)
          injected({ shimDisconnect: true }),
        ],
    ssr: true, // Changed to true since we're handling SSR properly now
  });
}