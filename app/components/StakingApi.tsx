import axios from "axios";
import { format } from "date-fns"
import toast from "react-hot-toast";

// export const TERMS: any= {
//     90: {id:1, aprBps: 23.67},
//     180: {id:2, aprBps: 49.84},
//     365: {id:3, aprBps: 81.66},
//     360: {id:4, aprBps: 119.00}
// };

export interface StakeInfo {
  id: number;
  period: number;
  amount: number;
  startDate: string;
  endDate: string;
  progress: number;
  isEnded: boolean;
  pending: number;
  status: string;
  stakeId: number;
  reward: number;
  withdraw: string;
  isClaim: boolean;
}
type RewardItem = {
  totalPending: number,
  totalClaimed: number,
};
export interface ChartDataPoint {
  value: string;
  timestamp: string;
}

export interface ChartResponse {
  current: number;
  historical: {
    symbol: string;
    currency: string;
    data: ChartDataPoint[];
  };
}

interface ClaimResponse {
  status: boolean;
  message: string;
}

export async function getPlanList() {

    try{
      const response = await axios.get(
        "/api/stake/plan",
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      let data=response?.data?.data || [];
      const TERMS = data.reduce((acc: any, item: any) => {
        acc[item.days] = { id: item.id, aprBps: item.apr };
        return acc;
      }, {} as Record<number, { id: number; aprBps: number }>);
      return {
        list:TERMS || {},
        status:response?.data?.success
      }
    }catch(err){
      return {
        list:{},
        status:false
      }
      
    }
}


export async function getUserStakedList(walletAddress: string): Promise<StakeInfo[]> {
  try {
    const response = await axios.post(
      "/api/stake/stakelist",
      { walletAddress },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response?.data?.data || [];

      let plans=response?.data?.plan || [];
      const TERMS = plans.reduce((acc: any, item: any) => {
        acc[item.days] = { id: item.id, aprBps: item.apr };
        return acc;
      }, {} as Record<number, { id: number; aprBps: number }>);
    
    const now = Date.now();

    const list: StakeInfo[] = data.map((item: any) => {
      const start = new Date(item.startDate).getTime();
      const end = new Date(item.endDate).getTime();

      const progress =
        now < start
          ? 0
          : now >= end
          ? 100
          : ((now - start) / (end - start)) * 100;

      const oneDay = new Date(item.lastClaimed);
      oneDay.setDate(oneDay.getDate() + 1);
      let currDate = new Date();

      return {
          id: item.stakeId,
          stakeId: item.id,
          period: ((): number => {
            const found = Object.keys(TERMS).find(
              (key) => TERMS[key].id === item.stakeId
            );
            return found ? Number(found) : 0;
          })(),
          amount: item.amount,
          startDate: format(new Date(start), "MM/dd/yyyy HH:mm"),
          endDate: format(new Date(end), "MM/dd/yyyy HH:mm"),
          progress,
          isEnded: new Date(end) < new Date(),
          pending: item.pending ?? 0,
          status:item.status,
          withdraw:item.withdraw,
          reward:item.reward,
          isClaim:currDate>=oneDay,
      };
    });
    console.log(list,'saaaaaaaaaaaaaaaaaaa')
    return list.filter((val) => (val.status != "claim" || val.withdraw != "withdraw") && val.withdraw != "unstake");
  } catch (err) {
    console.error("Error fetching stake list", err);
    return [];
  }
}

export async function getUserRewards(walletAddress: string): Promise<RewardItem> {
  try {
    const response = await axios.post(
      "/api/stake/rewards",
      { walletAddress },
      { headers: { "Content-Type": "application/json" } }
    );

    const totalPending = response?.data?.totalPending || 0;
    const totalClaimed = response?.data?.totalClaimed || 0;
    
    return {
      totalPending,
      totalClaimed,
    };
  } catch (err) {
    console.error("Error fetching rewards list", err);
     return {
      totalPending:0,
      totalClaimed:0,
    };
  }
}

export async function getChart(): Promise<ChartResponse> {
  try {
    const response = await axios.get("/api/baseChart/chart", {
      headers: { "Content-Type": "application/json" },
    });

    return response.data as ChartResponse;
  } catch (err) {
    console.error("Error fetching chart data", err);

    return {
      current: 0,
      historical: {
        symbol: "BTC",
        currency: "usd",
        data: [],
      },
    };
  }
}


export async function claimReward(
  walletAddress: string,
  planId: number
): Promise<ClaimResponse> {
  try {
    const response = await axios.post(
      "/api/stake/claimreward",
      { walletAddress, stakeId:planId },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response?.data;
    let toastId="claim"
     toast.success(`Claim completed successfully`, {
          id: toastId,
          duration: 5000,
          icon: '✅'
      })

    return {
      status: true,
      message: data?.message || "Success",
    };
  } catch (err) {
    console.error("Error claiming reward", err);
      toast.error("Failed to claim reward", {
          id: "claim",
          duration: 5000,
          icon: '✅'
      })
    return {
      status: false,
      message: "Failed to claim reward",
    };
  }
}


export async function withdrawAmt(
  walletAddress: string,
  id: number,
  txid: string,
): Promise<ClaimResponse> {
  try {
    const response = await axios.post(
      "/api/stake/withdraw",
      { walletAddress, stakeId:id,txid },
      { headers: { "Content-Type": "application/json" } }
    );
    return {
      status: true,
      message: "Success",
    };
  } catch (err) {
    console.error("Error claiming reward", err);
    return {
      status: false,
      message: "Failed to withdraw",
    };
  }
}