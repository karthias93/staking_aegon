"use client";

import { createConfig, http } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { network, rpc } from "./chain";

// Create config instance once (singleton pattern)
let wagmiConfigInstance: ReturnType<typeof createConfig> | null = null;

export function getWagmiConfig() {
  // Return existing instance if already created
  if (wagmiConfigInstance) {
    return wagmiConfigInstance;
  }

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
  }

  // Check if we're on the client side
  const isClient = typeof window !== "undefined";

  wagmiConfigInstance = createConfig({
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
      : [],
    ssr: true,
  });

  return wagmiConfigInstance;
}