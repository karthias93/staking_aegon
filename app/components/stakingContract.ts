import { useBalance, useAccount, useReadContracts } from "wagmi";
import STAKING_CONTRACT_ABI from "@/app/contract/staking.json";
import ERC20_ABI from "@/app/contract/Erc20.json";
import {
  waitForTransactionReceipt,
  writeContract,
  readContract,
  simulateContract,
} from "@wagmi/core";

import { network, chainId } from "../config/chain";
import { multicall, createConfig, http } from "@wagmi/core";
import { format } from "date-fns";
import { TERMS } from "../constants";
import { wagmiConfig } from "../config/wagmiConfig";
import toast from "react-hot-toast";
import { withdrawAmt } from "./StakingApi";

const config = createConfig({
  chains: [network],
  transports: {
    [chainId]: http(),
  },
});

const STAKING_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STAKING_CONTRACT ||
  ("0x898FbBFe3c539F026c842303d43A2A6c3F1a1617" as const);
const TOKEN_CONTRACT =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT ||
  ("0x78a5d1de296f351a4bC1316Fed9Db443381A80CD" as const);

interface TokenResult {
  balance: number;
  allowance: number;
  nativebalance: number;
}

type StakeInfo = {
  id: number;
  amount: number;
  totalstake: number;
  startDate: string;
  endDate: string;
  progress: number;
  isEnded: boolean;
  period: number;
  isClaimed: number;
};

export interface PlanInfo {
  id: number;
  duration: number;
  aprBps: number;
  fee?: number;
}

export function useTokenBalanceAndAllowance() {
  const { address: userAddress } = useAccount();

  const {
    data: nativeData,
    refetch: refetchNative,
    error: nativeError,
  } = useBalance({
    address: userAddress,
    chainId: chainId,
    enabled: !!userAddress,
  });

  const contracts = [
    {
      address: TOKEN_CONTRACT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`],
    },
    {
      address: TOKEN_CONTRACT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "decimals",
    },
    {
      address: TOKEN_CONTRACT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [
        userAddress as `0x${string}`,
        STAKING_CONTRACT_ADDRESS as `0x${string}`,
      ],
    },
  ] as const;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!userAddress,
    },
  });

  let balance = 0;
  let allowance = 0;
  let nativebalance = 0;

  if (data) {
    const rawBalance = data[0].result as bigint;
    const decimals = Number(data[1].result);
    const rawAllowance = data[2].result as bigint;

    balance = Number(rawBalance) / 10 ** decimals;
    allowance = Number(rawAllowance) / 10 ** decimals;
  }

  if (nativeData && nativeData.formatted) {
    nativebalance = Number(nativeData.formatted);
  }

  const result: TokenResult = {
    balance: isNaN(balance) ? 0 : balance,
    allowance: isNaN(allowance) ? 0 : allowance,
    nativebalance: isNaN(nativebalance) ? 0 : nativebalance,
  };

  return {
    result,
    isLoading,
    error,
    refetch: () => {
      refetchNative();
      refetchContracts();
    },
  };
}

export async function getUserStakedList(userAddress: `0x${string}`) {
  let termIds = Object.keys(TERMS)?.map((key: any) => {
    return TERMS[key].id;
  });

  var contracts = [];
  for (let j = 0; j < termIds.length; j++) {
    contracts.push({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_CONTRACT_ABI,
      functionName: "stakesByTerm",
      args: [termIds[j], userAddress],
    });
  }

  const results = await multicall(config, {
    contracts: contracts,
  });
  let decimals = 18;
  let list: StakeInfo[] = results.map((res, idx) => {
    if (!res?.result) {
      return {
        id: termIds[idx],
        amount: 0,
        startDate: "",
        endDate: "",
      };
    }

    const [, , rawAmount, rawStart, rawEnd] = res.result as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ];

    const start = Number(rawStart) * 1000;
    const end = Number(rawEnd) * 1000;
    const now = Date.now();
    const amount = Number(rawAmount) / 10 ** decimals;
    const startDate = format(new Date(start), "MM/dd/yyyy HH:mm");
    const endDate = format(new Date(end), "MM/dd/yyyy HH:mm");

    const progress =
      now < start
        ? 0
        : now >= end
        ? 100
        : ((now - start) / (end - start)) * 100;

    return {
      id: termIds[idx],
      period: Object.keys(TERMS).find((key) => TERMS[key].id === termIds[idx]),
      amount,
      startDate,
      endDate,
      progress,
      isEnded: new Date(end) < new Date(),
    };
  });

  list = list.filter((val) => val.amount > 0);

  return list;
}

export async function withdrawAmount(
  userAddress: string,
  id: number,
  stakedId: number
) {
  let toastId = undefined;
  try {
    toastId = toast.loading("Waiting for confirmation...");

    const estimateGas = await simulateContract(wagmiConfig, {
      address: process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: "withdraw",
      args: [id],
      chainId: chainId,
    });

    const stakeHash = await writeContract(wagmiConfig, {
      address: process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: "withdraw",
      args: [id],
      chainId: chainId,
    });

    toast.loading(
      `Waiting for confirmation...\nTx: ${stakeHash.slice(0, 10)}...`,
      {
        id: toastId,
        duration: Infinity,
      }
    );
    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: stakeHash,
      chainId: chainId,
    });
    await withdrawAmt(userAddress, stakedId, stakeHash);
    toast.dismiss(toastId);
    toast.success(`Withdraw completed successfully`, {
      id: toastId,
      duration: 5000,
      icon: "✅",
    });
  } catch (err: any) {
    const errorMsg = err?.message || err?.shortMessage || "";
    let message = `Something went wrong!`;
    if (errorMsg.includes("User denied transaction signature")) {
      message = `You denied the transaction request!`;
    } else if (errorMsg.includes("funds")) {
      message =
        "Insufficient gas. Add more funds to cover the transaction fee(ETH)";
    }
    toast.error(message, {
      id: toastId,
      duration: 5000,
      icon: "✅",
    });
  }
}

export async function getTermList() {
  try {
    let nextTermId = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
      abi: STAKING_CONTRACT_ABI,
      functionName: "nextTermId",
    });
    nextTermId = Number(nextTermId);

    if (nextTermId > 0) {
      var contracts = [];
      for (let j = 1; j < nextTermId; j++) {
        contracts.push({
          address: STAKING_CONTRACT_ADDRESS,
          abi: STAKING_CONTRACT_ABI,
          functionName: "terms",
          args: [j],
        });
      }
    }

    const results = await multicall(config, {
      contracts: contracts,
    });

    let list: PlanInfo[] = results.map((res, idx) => {
      const [days, apr, , , , wfee] = res.result as [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint
      ];
      const period = Number(days) / 86400;
      console.log(period, "periodperiodperiod");
      const aprPer = Number(apr) / 100;
      const fee = Number(wfee) / 100;
      return {
        id: idx + 1,
        duration: period,
        aprBps: aprPer,
        fee: fee,
      };
    });
    const minDuration = Math.min(...list.map((item) => item.duration));
    const maxDuration = Math.max(...list.map((item) => item.duration));
    console.log(list, "listlistlistlistlist");
    const TERMS: Record<number, { id: number; aprBps: number; fee?: number }> =
      {};
    list.forEach((item) => {
      TERMS[item.duration] = {
        id: item.id,
        aprBps: item.aprBps,
        fee: item.fee,
      };
    });

    return {
      list: TERMS,
      minDuration,
      maxDuration,
    };
  } catch (err) {
    return {
      list: [],
    };
  }
}
