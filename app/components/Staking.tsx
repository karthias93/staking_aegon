"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { ContractFunctionExecutionError } from "viem";
import axios from "axios";
import ChatCard from "./miscellaneous";
import {
  waitForTransactionReceipt,
  writeContract,
  simulateContract,
} from "@wagmi/core";
import { parseUnits } from "viem";
import { network, chainId } from "../config/chain";

import { useTokenBalanceAndAllowance, getTermList } from "./stakingContract";
import stakingAbi from "@/app/contract/staking.json";
import ERC20_ABI from "@/app/contract/Erc20.json";
import { getWagmiConfig } from "../config/wagmiConfig";
import StakedList from "./StakedList";
import { getUserRewards, getChart } from "./StakingApi";
import { toFixedTrunc } from "../utils/helper";

export default function StakeDashboard(): any {
  const { address: userAddress } = useAccount();
  const { connector } = useAccount();
  const [isConnectorReady, setIsConnectorReady] = useState(false);

  const [amount, setAmount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(90);
  const [loading, setIsLoading] = useState<boolean>(false);
  const [isloadStake, setisloadStake] = useState<boolean>(false);
  const [TERMS, setTERMS] = useState<any>({});
  const [pendingreward, setpendingreward] = useState<number>(0);
  const [claimedreward, setclaimedreward] = useState<number>(0);
  const [ethrate, setethrate] = useState<number>(0);

  const { address, isConnected } = useAccount();
  const wagmiConfig = getWagmiConfig();
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setAmount(Number(e.target.value));
  };

  const handleDurationChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setDuration(Number(e.target.value));
  };

  const { result: tokenData, refetch } = useTokenBalanceAndAllowance();

  useEffect(() => {
    getList();
    setTimeout(function () {
      getPrice();
    });
  }, []);

  useEffect(() => {
    getrewardInfo();
  }, [address, isConnected]);

  useEffect(() => {
    const checkConnector = async () => {
      if (isConnected && connector) {
        try {
          // Try to get the provider to verify connection is ready
          await connector.getProvider();
          setIsConnectorReady(true);
        } catch (err) {
          console.error("Connector not ready:", err);
          setIsConnectorReady(false);
        }
      } else {
        setIsConnectorReady(false);
      }
    };

    checkConnector();
  }, [isConnected, connector]);

  async function getrewardInfo() {
    if (address) {
      let { totalPending, totalClaimed } = await getUserRewards(address);
      setpendingreward(totalPending);
      setclaimedreward(totalClaimed);
    }
  }

  async function getList() {
    let { list } = await getTermList();
    setTERMS(list);
    setDuration(Number(Object.keys(list)?.[0]) ?? 90);
  }

  async function getPrice() {
    let { current, historical } = await getChart();
    setethrate(current);
  }

  const handleStake = async () => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet to continue.");
      return;
    }

    if (tokenData?.balance < amount) {
      toast.error("Insufficient balance");
      return;
    }

    setIsLoading(true);
    let toastId = undefined;

    try {
      const wagmiConfig = getWagmiConfig();

      // Handle approval if needed
      if (tokenData?.allowance < amount) {
        toastId = toast.loading("Submitting approval transaction...");
        let allowanceAmt = 10000000000000000000;

        const hash = await writeContract(wagmiConfig, {
          address: process.env.NEXT_PUBLIC_TOKEN_CONTRACT as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [
            process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`,
            parseUnits(allowanceAmt.toString(), 18),
          ],
          chain: network,
          chainId: chainId,
        });

        toast.loading(
          `Waiting for confirmation...\nTx: ${hash.slice(0, 10)}...`,
          {
            id: toastId,
            duration: Infinity,
          }
        );

        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: chainId,
        });

        toast.success(
          `Approval confirmed!\nYou can now proceed with staking.`,
          {
            id: toastId,
            duration: 5000,
            icon: "✅",
          }
        );

        // Dismiss approval toast before staking
        toast.dismiss(toastId);
        toastId = undefined;
      }

      // Add a small delay to ensure approval is fully processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate before writing
      toastId = toast.loading("Preparing stake transaction...");

      try {
        await simulateContract(wagmiConfig, {
          address: process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`,
          abi: stakingAbi,
          functionName: "stake",
          args: [parseUnits(amount.toString(), 18), TERMS?.[duration]?.id ?? 1],
          chainId: chainId,
          account: address, // Explicitly pass the account
        });
      } catch (simError: any) {
        console.error("Simulation error:", simError);
        throw new Error(
          simError?.shortMessage || "Transaction simulation failed"
        );
      }

      // Execute stake
      toast.loading("Submitting stake transaction...", { id: toastId });

      const stakeHash = await writeContract(wagmiConfig, {
        address: process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`,
        abi: stakingAbi,
        functionName: "stake",
        args: [parseUnits(amount.toString(), 18), TERMS?.[duration]?.id ?? 1],
        chainId: chainId,
      });

      toast.loading(
        `Waiting for confirmation...\nTx: ${stakeHash.slice(0, 10)}...`,
        {
          id: toastId,
          duration: Infinity,
        }
      );

      await waitForTransactionReceipt(wagmiConfig, {
        hash: stakeHash,
        chainId: chainId,
      });

      // Save to database
      try {
        await axios.post(
          "/staking/api/stake/add",
          {
            txId: stakeHash,
            amount,
            walletAddress: address,
            planId: TERMS?.[duration]?.id,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } catch (err) {
        console.error("Database save error:", err);
      }

      await refetch();

      toast.dismiss(toastId);
      toast.success(`Stake completed successfully`, {
        duration: 5000,
        icon: "✅",
      });

      setIsLoading(false);
      setisloadStake(true);
      setTimeout(() => {
        setisloadStake(false);
      }, 5000);
    } catch (err: any) {
      let errMsg = "Something went wrong!";
      console.error("Stake error:", err);

      if (err instanceof ContractFunctionExecutionError) {
        let msg = (err as any).cause?.reason || err.message;
        if (msg.includes("please withdraw")) {
          errMsg = "Please withdraw and continue";
        } else if (msg.includes("funds")) {
          errMsg =
            "Insufficient gas. Add more funds to cover the transaction fee (ETH)";
        }
      } else if (err?.message?.includes("Connector not connected")) {
        errMsg = "Wallet connection lost. Please reconnect your wallet.";
      } else if (
        err?.message?.includes("User rejected") ||
        err?.message?.includes("User denied")
      ) {
        errMsg = "Transaction rejected by user";
      }

      setIsLoading(false);
      toast.error(errMsg, {
        id: toastId,
        duration: 5000,
      });
    }
  };

  function selectPlan(item: number) {
    setDuration(item);
  }

  async function handleBal() {
    setTimeout(async function () {
      await refetch();
    }, 1500);
  }

  async function handleReward() {
    await getrewardInfo();
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#055656] to-[#004646] text-[#CFFFFF] text-md font-College p-6">
        <div className="grid grid-cols-1 lg:grid-cols-9 gap-6">
          <div
            className="lg:col-span-2 shadow-lg bg-[#022222] overflow-hidden text-center text-white h-full"
            style={{
              border: "2px solid transparent",
              borderImage: "linear-gradient(to bottom, #000000, #49A1A2) 1",
            }}
          >
            <div className="bg-gradient-to-b from-[#00000000] to-[#000000] flex items-center justify-center h-50 flex-col">
              <img
                src="/staking/images/AEGON-ICON.png"
                alt="aegon"
                className="w-[100px] lg:w-[200px]"
              />
            </div>
            <div className="p-6 h-full flex items-center flex-col gap-5">
              <p className="text-sm font-normal leading-relaxed text-white uppercase">
                Aegon is an autonomous AI agent designed to build and launch
                fully playable games with no human intervention. $AEGON is the
                project token.
              </p>
              <div className="text-left gap-2 flex flex-col">
                <p>How it works:</p>
                <p>
                  Stake $AEGON, to earn Jungl XP, our utility point system.
                  Jungl XP can be used to:
                </p>
                <p>- Buy and trade NFTs and Ordinals on JUNGL Marketplace</p>
                <p>
                  - Participate in live game sessions, such as Bitcoin Derby and
                  Cypher Striker
                </p>
                <p>- Enhance gameplay performance through in-game boosts</p>
                <p>- Purchase and upgrade access to games in the ecosystem</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div
              className="lg:col-span-2 bg-[#0222221A] p-6 rounded-lg shadow-sm"
              style={{
                border: "2px solid transparent",
                borderImage: "linear-gradient(to bottom, #000000, #49A1A2) 1",
              }}
            >
              <h2 className="text-2xl font-college-400  text-white mb-4">
                CREATE NEW STAKE
              </h2>

              <input
                type="text"
                //value={`${amount} AEGON`}
                value={`${amount}`}
                onChange={handleAmountChange}
                className="w-full p-3 bg-[#CFFFFF] text-black font-bold placeholder-black/60 border border-[#022222] focus:outline-none"
                placeholder="0 AEGON"
              />

              <div className="flex flex-col md:flex-row gap-2 mb-4 mt-6 justify-between">
                <div className="flex gap-2 justify-center md:justify-start">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      className="py-2 px-3 md:px-5 bg-[#022222] hover:bg-[#03636D] rounded-full font-bold text-sm"
                      onClick={() =>
                        setAmount(
                          tokenData?.balance ? (tokenData.balance * p) / 100 : 0
                        )
                      }
                    >
                      {p}%
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-lg mb-4">
                  <div>
                    AVAILABLE :{" "}
                    <span className="font-normal text-md text-white">
                      {toFixedTrunc(tokenData.balance, 4)} $AEGON
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-lg font-semibold">Duration</label>
                  <div className="text-md font-normal">
                    PERIOD:{" "}
                    <span className="font-bold text-white">
                      {(duration / 30).toFixed(0)} MONTHS
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={90}
                  max={360}
                  step={90}
                  value={duration}
                  onChange={handleDurationChange}
                  style={
                    {
                      "--value": `${((duration - 90) / (360 - 90)) * 100}%`,
                    } as React.CSSProperties
                  }
                  className="w-full custom-range"
                />

                <div className="flex justify-between text-md mt-2 font-bold">
                  <span>90 Days</span>
                  <span>180 Days</span>
                  <span>270 Days</span>
                  <span>360 Days</span>
                </div>
              </div>

              <div className="grid grid-cols-3 text-center mt-10 mb-4">
                <div className="border-r-[5px] border-[#008E8E]">
                  <p className="text-md">STAKING PERIOD</p>
                  <p className="font-college text-white">{duration} DAYS</p>
                </div>
                <div className="border-r-[5px] border-[#008E8E]">
                  <p className="text-md">XP APR</p>
                  <p className="font-college text-white">
                    {TERMS?.[duration]?.aprBps ?? 23.67}%
                  </p>
                </div>
                <div>
                  <p className="text-md">REQUIRED ACTION</p>
                  <p className="font-college text-white">
                    TOKEN APPROVAL REQUIRED
                  </p>
                </div>
              </div>

              <div className="w-full bg-[#429A9E] text-center text-s py-4 px-3 mt-10 mb-4">
                PLEASE MAKE SURE THE APPROVAL IS CONFIRMED BEFORE STAKE
              </div>

              <div className="flex justify-center mt-10">
                <button
                  className={`w-[70%] mx-auto px-3 py-4 flex items-center justify-center  
                  bg-gradient-to-r from-[#FFFFFF] to-[#3F9C9D] 
                  text-black font-bold 
                  shadow-[0_4px_6px_#00000099] 
                  hover:from-[#3F9C9D] hover:to-[#FFFFFF] 
                  ${
                    amount <= 0 ||
                    tokenData.balance < amount ||
                    loading ||
                    !isConnected ||
                    !isConnectorReady
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed shadow-none hover:from-gray-400 hover:to-gray-400"
                      : "cursor-pointer"
                  }`}
                  disabled={
                    amount <= 0 ||
                    tokenData.balance < amount ||
                    loading ||
                    !isConnected ||
                    !isConnectorReady
                  }
                  onClick={handleStake}
                >
                  {!isConnected
                    ? "Please Connect Wallet"
                    : !isConnectorReady
                    ? "Wallet Connecting..."
                    : tokenData.balance < amount
                    ? "Insufficient Balance"
                    : tokenData.allowance >= amount
                    ? `STAKE ${amount.toFixed(
                        2
                      )} $AEGON to ${duration} Days Pool`
                    : "Approve"}
                </button>
              </div>
              <br></br>
              {loading && (
                <p className="text-yellow-600 bg-yellow-100 p-3 rounded-md text-center font-medium">
                  Please do not refresh the page. Your transaction is being
                  processed.
                </p>
              )}
            </div>
            <div>
              <StakedList
                isConnected={isConnected}
                userAddress={userAddress}
                isloadStake={isloadStake}
                onUpdateBalance={handleBal}
                onUpdateReward={handleReward}
              />
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <div
              className="bg-[#0000001A] p-4 rounded-lg shadow-sm"
              style={{
                border: "2px solid transparent",
                borderImage: "linear-gradient(to bottom, #000000, #49A1A2) 1",
              }}
            >
              <h3 className="font-semibold mb-3 text-white">DETAILED INFO</h3>
              <div className="flex justify-between items-center mb-2">
                <p className="text-lg mb-2">TOKEN: $AEGON</p>
                <p className="text-lg mb-2">Available Pools</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {Object.keys(TERMS)?.map((key: any) => {
                  return (
                    <div
                      className="bg-gradient-to-r from-[#FFFFFF] to-[#459FA0] hover:from-[#459FA0] hover:to-[#FFFFFF] text-[#022222] p-2"
                      key={key}
                      onClick={() => selectPlan(key)}
                    >
                      <p className="text-xs">
                        APR {(key / 30).toFixed(0)} Month
                      </p>
                      <p className="font-bold">{TERMS[key]?.aprBps}%</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-md text-white mt-2">
                Important:
                <span className="text-[#FFFFFF99] ">
                  Unstaking your tokens early forfeits all unclaimed rewards.
                </span>
              </p>
            </div>

            <div
              className="bg-[#0000001A] p-4 shadow-sm"
              style={{
                border: "2px solid transparent",
                borderImage: "linear-gradient(to bottom, #000000, #49A1A2) 1",
              }}
            >
              <h3 className="font-bold mb-2 text-white">MISCELLANEOUS</h3>
              <div className="flex justify-between mb-2">
                <p className="text-md">Native Token [ETH]</p>
                <p className="text-lg font-bold text-white">0.12 ETH</p>
              </div>
              <ChatCard />
            </div>

            <div className="flex flex-col md:flex-row gap-5">
              <div
                className="flex-1 bg-[#0000001A] p-4 rounded-lg shadow-sm"
                style={{
                  border: "2px solid transparent",
                  borderImage: "linear-gradient(to bottom, #000000, #49A1A2) 1",
                }}
              >
                <h3 className="font-bold mb-2 text-white">REWARDS</h3>
                <p className="text-sm">
                  Pending XP Rewards: <br /> {toFixedTrunc(pendingreward, 8)} XP
                </p>
                <p className="text-sm">
                  Total XP Rewards / Claimed:
                  <br />
                  {toFixedTrunc(claimedreward, 8)} XP
                </p>
                {/* <button className="mt-3 w-full py-2 bg-gradient-to-r from-gray-200 to-gray-400 text-black rounded font-bold">
                      CLAIM
                    </button> */}
              </div>

              <div
                className="flex-1 bg-[#0000001A] p-4 rounded-lg shadow-sm"
                style={{
                  border: "2px solid transparent",
                  borderImage: "linear-gradient(to bottom, #000000, #49A1A2) 1",
                }}
              >
                <h3 className="font-bold mb-2 text-white">BALANCE</h3>
                <p className="text-sm">
                  ETH Balance: {toFixedTrunc(tokenData?.nativebalance, 5)}
                </p>
                <p className="text-sm">
                  AEGON Balance: {toFixedTrunc(tokenData?.balance, 5)}
                </p>
                <p className="text-sm">ETH Price: $4,300</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
