"use client";

import React, { type ReactNode, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "../config/wagmiConfig";
import { WalletProvider } from "./WalletContext";
import { XpProvider } from "./XpContext";

// Create QueryClient once outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function ContextProvider({ children }: { children: ReactNode }) {
  // Memoize config to prevent recreation
  const wagmiConfig = useMemo(() => getWagmiConfig(), []);

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