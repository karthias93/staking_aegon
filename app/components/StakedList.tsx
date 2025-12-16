"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "./progress";
import { withdrawAmount,getTermList } from './stakingContract';
import {getUserStakedList, StakeInfo,claimReward} from "./StakingApi";


type StakedListProps = {
  isConnected: boolean;
  userAddress?: `0x${string}`;
  isloadStake: boolean;
  onUpdateBalance: (val: any) => void;
  onUpdateReward: (val: any) => void;
};

export default function StakedList({
  isConnected,
  userAddress,
  isloadStake,
  onUpdateBalance,
  onUpdateReward,
}: StakedListProps) {
  const [stakes, setStakes] = useState<StakeInfo[]>([]);
  const [loading, setIsLoading] = useState<boolean>(false);
  const [currentId, setcurrentId] = useState<number>(0);
  const [currentId1, setcurrentId1] = useState<number>(0);
  const [claimId, setclaimId] = useState<number>(0);
  const [loading1, setIsLoading1] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && userAddress) {
      getList();
    }
  }, [isConnected, userAddress, isloadStake]);

  async function getList() {
    if (isConnected && userAddress) {
      const list = await getUserStakedList(userAddress);
      setStakes(list);
      getTermList()
    }
  }

  async function withdraw(item: number, isWithdraw: number, stakedId: number) {
    if (isWithdraw == 1) {
      setcurrentId(item);
    } else {
      setcurrentId1(item);
    }

    if (loading) {
      return;
    }
    setIsLoading(true);
    await withdrawAmount(userAddress,item,stakedId);
    if (isWithdraw == 1) {
      setcurrentId(0);
    } else {
      setcurrentId1(0);
    }
    onUpdateBalance("refetch");
    setTimeout(function () {
      getList();
      setIsLoading(false);
    }, 1500);
  }

  async function claim(item:number,stakedId:number){
      if(loading1){
        return
      }
      setIsLoading1(true);
      setclaimId(item);
      await claimReward(userAddress,stakedId)
      setIsLoading1(false);
      
      setTimeout(function(){
        getList();
        setclaimId(0);
        onUpdateReward()
      },1500)
  }

  return (
    <div
      className="bg-[#00000033] px-4 py-6 font-College"
      style={{
        border: "2px solid transparent",
        borderImage: "linear-gradient(to bottom, #FFFFFF, #49A1A2) 1",
      }}
    >
      <h3 className="font-bold-700 text-2xl text-white">STAKED</h3>

      {stakes.length === 0 ? (
        <p className="text-#CFFFFF-400">
          You don’t currently have any active stakes…
        </p>
      ) : (
        <div className="space-y-4">
          {stakes.map((stake, idx) => {
            return (
              <div
                key={idx}
                className="bg-[#012D34] text-white rounded-2xl shadow-lg p-5 space-y-3"
              >
                <h3 className="text-lg font-bold">{(stake.period/86400).toFixed(0)} Day Stake</h3>
                <p className="text-xl font-semibold">{stake.amount} $AEGON</p>

                <div className="text-sm text-gray-300 space-y-1">
                  <p>Start Date: {stake.startDate}</p>
                  <p>End Date: {stake.endDate}</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{stake.progress.toFixed(1)}% complete</span>
                  </div>
                  <ProgressBar value={stake.progress} />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    className={
                      !stake.isEnded || stake.amount == 0 || loading
                        ? "flex-1 bg-[#024A53] hover:bg-[#03636f] cursor-not-allowed"
                        : "flex-1 bg-[#024A53] hover:bg-[#03636f] cursor-pointer"
                    }
                    disabled={!stake.isEnded || stake.amount == 0 || loading}
                    onClick={() => withdraw(stake.id, 1,stake.stakeId)}
                  >
                    {currentId == stake.id ? "Processing..." : "Withdraw"}
                  </button>
                  <button
                    className={
                      stake.isEnded || stake.amount == 0 || loading
                        ? "flex-1 bg-gray-600 text-gray-300 cursor-not-allowed"
                        : "flex-1 bg-[#024A53] cursor-pointer"
                    }
                    disabled={stake.isEnded || loading}
                    onClick={() => withdraw(stake.id, 2,stake.stakeId)}
                  >
                    {currentId1 == stake.id ? " Processing..." : "Unstake"}
                  </button>
                  <button
                      className={((!stake.isClaim) || (loading1 && claimId==stake.id))
                        ?"flex-1 bg-gray-600 text-gray-300 cursor-not-allowed":
                        "flex-1 bg-[#024A53] cursor-pointer"
                      }
                      disabled={((!stake.isClaim) || (loading1 && claimId==stake.id))}
                      onClick={()=>claim(stake.id,stake.stakeId)}
                    >
                    {loading1 && claimId==stake.id? " Processing...":stake.status=="claim"?"Claimed":"Claim"
                    }
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
