import { NextRequest,NextResponse  } from "next/server";
import { stakinglist,stakingplan,claimedrewards} from "../../db/schema/user";
import { db } from "../../db/route";
import { and, eq,sql } from "drizzle-orm";
import {pendingReward} from "../../lib/stake";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    const list = await db
    .select({
      id: stakinglist.id,
      amount: stakinglist.amount,
      walletAddress: stakinglist.walletAddress,
      startDate: stakinglist.startDate,
      endDate: stakinglist.endDate,
      aprBps: stakingplan.apr,
      reward: stakinglist.reward,
      status: stakinglist.status,
      lastClaimed: stakinglist.lastClaimed,
    })
    .from(stakinglist)
    .leftJoin(stakingplan, eq(stakinglist.stakeId, stakingplan.id))
    .where(
      and(
        eq(stakinglist.walletAddress, walletAddress),
        eq(stakinglist.status, "pending")
      )
    );

    let totalPending = 0;
    const enrichedList = list.map((item) => {
      const pending = pendingReward({
        amount: Number(item.amount),
        aprBps: Number(item.aprBps)*100,
        startDate: new Date(item.lastClaimed),
        endDate: new Date(item.endDate),
      });
      console.log(pending,'pendingpendingpending',item.aprBps,item.amount,new Date(item.lastClaimed))
      let alredy = item.reward ||0
      totalPending += pending+alredy;

      return {
        ...item,
        pendingReward: pending,
      };
    });

    const claimedSum = await db
    .select({
      totalClaimed: sql<number>`SUM(${claimedrewards.reward})`,
    })
    .from(claimedrewards)
    .where(
      and(
        eq(claimedrewards.walletAddress, walletAddress)
      )
    );
    console.log(claimedSum,'totalClaimedtotalClaimed');
    const totalClaimed = claimedSum[0]?.totalClaimed ?? 0;

    return NextResponse.json({
      success: true,
      totalPending,
      totalClaimed,
      msg: "Fetched staking list with pending rewards",
    });
  } catch (error) {
    console.error("Fetch failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
