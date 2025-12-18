"use client";

import React, { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "../config/wagmiConfig";
import { WalletProvider } from "./WalletContext";
import { XpProvider } from "./XpContext";

const queryClient = new QueryClient();

export default function ContextProvider({ children }: { children: ReactNode }) {
  const wagmiConfig = getWagmiConfig()
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <XpProvider>{children}</XpProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
