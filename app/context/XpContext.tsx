"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useWallet } from "./WalletContext";

interface XpContextType {
    isXp: boolean;
    isCreate: boolean;
    isloaded: boolean;
    isreloadbal: boolean;
    xpbalance:number;
    reloadXP: () => Promise<void>
}

const XpContext = createContext<XpContextType | undefined>(undefined);

export const XpProvider = ({ children }: { children: React.ReactNode }) => {
  const { walletAddress } = useWallet();
  const [isXp, setIsXp] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [isloaded, setIsloaded] = useState(true);
  const [isreloadbal, setIsreloadbal] = useState(false);
  const [xpbalance, setxpbalance] = useState(0);

  useEffect(() => {
    fetchXPDetails();
  }, [walletAddress, isreloadbal]);

  async function fetchXPDetails() {
    if (walletAddress) {
      const checkEligible = await axios.post(
        "/staking/api/game/latest-game",
        { walletAddress },
        { headers: { "Content-Type": "application/json" } }
      );

      let canCreate = checkEligible?.data?.canCreate || false;
      let isBalance = checkEligible?.data?.isBalance || false;
      let balance = checkEligible?.data?.balance || 0;

      setIsXp(isBalance);
      setIsCreate(canCreate);
      setIsloaded(false);
      setIsreloadbal(false);
      setxpbalance(balance);
    }
  }

  return (
    <XpContext.Provider
      value={{
        isXp,
        isCreate,
        isloaded,
        isreloadbal,
        xpbalance,
        reloadXP: fetchXPDetails
      }}
    >
      {children}
    </XpContext.Provider>
  );
};

export const useXp = () => {
  const context = useContext(XpContext);
  if (!context) {
    throw new Error("useXp must be used within XpProvider");
  }
  return context;
};
