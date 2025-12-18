import { NextRequest,NextResponse  } from "next/server";
import { stakinglist,stakingplan,users,stakehistory,withdrawhistory} from "../../../lib/db/schema/user";
import { db } from "../../../lib/db/db";
import { and, eq } from "drizzle-orm";
import {pendingReward,getStakeInfo} from "../../lib/stake"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(body,'bodybodybodybodybody')
    const { stakeId, walletAddress,txid } = body;

    const getuser = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (!getuser.length) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

   const isExits = await db
    .select({
      id: stakinglist.id,
      amount: stakinglist.amount,
      walletAddress: stakinglist.walletAddress,
      startDate: stakinglist.startDate,
      endDate: stakinglist.endDate,
      aprBps: stakingplan.apr,
      status: stakinglist.status,
      reward: stakinglist.reward,
      lastClaimed: stakinglist.lastClaimed,
      userId: stakinglist.userId,
      stakeId: stakinglist.stakeId,
    })
    .from(stakinglist)
    .leftJoin(stakingplan, eq(stakinglist.stakeId, stakingplan.id))
    .where(
      and(
        eq(stakinglist.walletAddress, walletAddress),
        eq(stakinglist.id, stakeId),
      )
    ).limit(1);

    if (!isExits.length) {
        return NextResponse.json({ error: "Invalid withdraw" }, { status: 400 });
    }

    const existing = isExits[0];
    let endDate = new Date(existing.endDate);

    let apr = existing.aprBps || 0;
    let amount = existing.status !="claim"?existing.amount:0;
    let newReward = pendingReward({
        amount: amount ||0,
        aprBps: apr * 100,
        startDate: existing.lastClaimed,
        endDate: existing.endDate,
    });
    
    const updatedPending = (existing.reward || 0) + newReward;

    const updated = await db
    .update(stakinglist)
    .set({
        reward: new Date()>endDate?updatedPending:0,
        withdraw:new Date()>endDate?"withdraw":"unstake",
        amount:0
    })
    .where(eq(stakinglist.id, existing.id))
    .returning();

     const inserted = await db
              .insert(withdrawhistory)
              .values({
                walletAddress,
                userId:existing.userId,
                txId:txid,
                stakeId: existing.stakeId,
                type:"xp",
                amount:existing.amount
              })
              .returning();

    return NextResponse.json({ success: true, msg: "Claim updated" });
    
  } catch (error) {
    console.error("Insert failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 200 });
  }
}