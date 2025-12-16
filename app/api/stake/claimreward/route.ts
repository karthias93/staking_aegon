import { NextRequest,NextResponse  } from "next/server";
import { stakinglist,stakingplan,users,stakehistory,claimedrewards  } from "../../db/schema/user";
import { db } from "../../db/route";
import { and, eq } from "drizzle-orm";
import {pendingReward,getStakeInfo,claimBonus} from "../../lib/stake"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(body,'bodybodybodybodybody')
    const { stakeId, walletAddress } = body;

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
      stakeId: stakinglist.stakeId,
      userId: stakinglist.userId,
    })
    .from(stakinglist)
    .leftJoin(stakingplan, eq(stakinglist.stakeId, stakingplan.id))
    .where(
      and(
        eq(stakinglist.walletAddress, walletAddress),
        eq(stakinglist.status, "pending"),
        eq(stakinglist.id, stakeId)
      )
    ).limit(1);

    if (!isExits.length) {
        return NextResponse.json({ error: "Invalid claim" }, { status: 400 });
    }

    const existing = isExits[0];

    const date1 = new Date()>existing.endDate?existing.endDate:new Date();
    const date2 = new Date(existing.lastClaimed);
    const diffMs = date1 - date2;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let oneDay = new Date(existing.lastClaimed);
    
    console.log(diffDays,'diffDaysdiffDaysdiffDays')
    if(diffDays<1){
        return NextResponse.json({ error: "every claim is 24 hours only" }, { status: 400 });
    }

    oneDay.setDate(oneDay.getDate() + diffDays);

    const endDate = new Date(existing.endDate);

    // if(endDate>oneDay){
    //     return NextResponse.json({ error: "Stake is still active" }, { status: 400 });
    // }
    
    let apr = existing.aprBps || 0;
    const newReward = pendingReward({
        amount: existing.amount ||0,
        aprBps: apr * 100,
        startDate: existing.lastClaimed,
        endDate:oneDay,
    });
    oneDay = oneDay>endDate?endDate:oneDay;
    const updatedPending = (existing.reward || 0) + newReward;

    let updateCnd = {
        reward: 0,
        lastClaimed:oneDay
    }
    if(new Date()>existing.endDate){
          updateCnd = {
              reward: 0,
              lastClaimed:oneDay,
              status:"claim"
          }
    }

    let resp =await claimBonus(walletAddress,updatedPending,existing.stakeId)
    console.log(resp,'resprespresp')
    if(resp){
      const updated = await db
      .update(stakinglist)
      .set(updateCnd)
      .where(eq(stakinglist.id, existing.id))
      .returning();
    
     const inserted = await db
          .insert(claimedrewards)
          .values({
            walletAddress,
            userId:existing.userId,
            stakeId: existing.stakeId,
            reward: updatedPending,
            type:"xp"
          })
          .returning();
    }
   

    return NextResponse.json({ success: true, msg: "Claim updated" });
    
  } catch (error) {
    console.error("Insert failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 200 });
  }
}