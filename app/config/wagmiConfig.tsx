"use client";

import { createConfig, http } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { network, rpc } from "./chain";

export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
}

export const wagmiConfig = createConfig({
  chains: [network],
  transports: {
    [network.id]: http(rpc),
  },
  connectors: [
    injected({ shimDisconnect: true }), // MetaMask + browser wallets
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
  ],
  ssr: false, // 🔴 VERY IMPORTANT
});
