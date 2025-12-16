import { NextRequest,NextResponse  } from "next/server";
import { stakinglist,stakingplan,users,stakehistory  } from "../../db/schema/user";
import { db } from "../../db/route";
import { and, eq,gt } from "drizzle-orm";
import {pendingReward,getStakeInfo} from "../../lib/stake"
import { ethers } from "ethers";
import ABI from "../../../contract/staking.json";

const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { amount, txId, planId, walletAddress } = body;


//     const plan = await db
//       .select()
//       .from(stakingplan)
//       .where(eq(stakingplan.id, planId))
//       .limit(1);

//     if (!plan.length) {
//       return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
//     }

//     const { days, apr } = plan[0];

//     const getuser = await db
//       .select()
//       .from(users)
//       .where(eq(users.walletAddress, walletAddress))
//       .limit(1);

//     if (!getuser.length) {
//       return NextResponse.json({ error: "Invalid user" }, { status: 400 });
//     }

//     const { id: userId } = getuser[0];

//     const isExits = await db
//       .select()
//       .from(stakinglist)
//       .where(
//         and(
//           eq(stakinglist.stakeId, plan[0].id),
//           eq(stakinglist.walletAddress, walletAddress),
//           gt(stakinglist.amount, 0)
//         )
//       )
//       .limit(1);

//        const startDate = new Date();
//        const endDate = new Date(startDate.getTime() + days * 1000);
//        //const endDate = new Date(startDate.getTime() + days * 1000);
//        console.log(planId,walletAddress,'planId,walletAddress')
//       //let {startDate,endDate}=await getStakeInfo(planId,walletAddress,days)
//       console.log(startDate,endDate,'21211212')
//       if(new Date()>endDate){
//           if(isExits && isExits[0] && isExits[0].status=="pending"){
//             return NextResponse.json({ error: "Please claim amount and continue" }, { status: 400 });
//           }else if(isExits && isExits[0] && isExits[0].withdraw=="pending"){
//             return NextResponse.json({ error: "Please withdraw amount and continue" }, { status: 400 });
//           }
//       }
     
//       await db
//       .insert(stakehistory)
//       .values({
//         amount,
//         walletAddress,
//         txid: txId,
//         startDate,
//         endDate,
//         userId,
//         stakeId: plan[0].id,
//         type:"xp"
//       })
//       .returning();

//     if (isExits.length && endDate>new Date()) {
//       const existing = isExits[0];

//       const newReward = pendingReward({
//         amount: existing.amount,
//         aprBps: apr * 100,
//         startDate: existing.lastClaimed,
//         endDate: existing.endDate,
//       });

//       const updatedAmount = existing.amount + amount;
//       const updatedPending = (existing.reward || 0) + newReward;

//       const updated = await db
//         .update(stakinglist)
//         .set({
//           amount: updatedAmount,
//           reward: updatedPending,
//           startDate,
//           endDate,
//           updatedAt: new Date(),
//         })
//         .where(eq(stakinglist.id, existing.id))
//         .returning();

//       return NextResponse.json({ success: true, data: updated, msg: "Stake updated" });
//     }

//     const inserted = await db
//       .insert(stakinglist)
//       .values({
//         amount,
//         walletAddress,
//         startDate,
//         endDate,
//         lastClaimed:startDate,
//         userId,
//         stakeId: plan[0].id,
//         reward: 0,
//         type:"xp"
//       })
//       .returning();

//     return NextResponse.json({ success: true, data: inserted, msg: "New stake created" });
//   } catch (error) {
//     console.error("Insert failed:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, txId, planId, walletAddress } = body;


    const plan = await db
      .select()
      .from(stakingplan)
      .where(eq(stakingplan.id, planId))
      .limit(1);

    if (!plan.length) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

    const { days, apr } = plan[0];

    const getuser = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (!getuser.length) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { id: userId } = getuser[0];

    const isExits = await db
      .select()
      .from(stakinglist)
      .where(
        and(
          eq(stakinglist.stakeId, plan[0].id),
          eq(stakinglist.walletAddress, walletAddress),
          gt(stakinglist.amount, 0)
        )
      )
      .limit(1);

       const startDate = new Date();
       const endDate = new Date(startDate.getTime() + days * 1000);
       //const endDate = new Date(startDate.getTime() + days * 1000);
       console.log(planId,walletAddress,'planId,walletAddress')
      //let {startDate,endDate}=await getStakeInfo(planId,walletAddress,days)
      console.log(startDate,endDate,'21211212')
      if(new Date()>endDate){
          if(isExits && isExits[0] && isExits[0].status=="pending"){
            return NextResponse.json({ error: "Please claim amount and continue" }, { status: 400 });
          }else if(isExits && isExits[0] && isExits[0].withdraw=="pending"){
            return NextResponse.json({ error: "Please withdraw amount and continue" }, { status: 400 });
          }
      }
     
    let obj={
      txid:txId,
      planId:plan[0].id,
      walletAddress,
      userId,
      startDate,
      endDate,
      apr
    }
    checkTx(0,obj)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return NextResponse.json({ success: true, msg: "New stake created" });
  } catch (error) {
    console.error("Insert failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


async function checkTx(retry = 0, obj) {
  try {
    const tx = await provider?.getTransaction(obj?.txid);

    if (!tx) {
      throw new Error("Transaction not found yet");
    }

    console.log("From:", tx.from);
    console.log("To (contract):", tx.to);
    //console.log("Input data (raw):", tx.data);

    const iface = new ethers.Interface(ABI);
    const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });

    const amount = ethers.formatUnits(decoded.args[0], 18);

    if (!amount) {
      throw new Error("Transaction amount invalid");
    }

    if (
      tx.from.toLowerCase() !== obj.walletAddress.toLowerCase() ||
      tx.to.toLowerCase() !== process.env.NEXT_PUBLIC_STAKING_CONTRACT?.toLowerCase()
    ) {
      throw new Error("Invalid staking transaction");
    }

    await db.transaction(async (trx) => {
     
      await trx.insert(stakehistory).values({
        amount: amount || 0,
        walletAddress: obj?.walletAddress,
        txid: obj?.txid,
        userId: obj?.userId,
        stakeId: obj?.planId,
        type: "xp",
      });

      // Check existing stake
      const isExits = await trx
        .select()
        .from(stakinglist)
        .where(
          and(
            eq(stakinglist.stakeId, obj?.planId),
            eq(stakinglist.walletAddress, obj?.walletAddress),
            gt(stakinglist.amount, 0)
          )
        )
        .limit(1);

      if (isExits.length && obj?.endDate > new Date()) {
        const existing = isExits[0];

        const newReward = pendingReward({
          amount: existing.amount,
          aprBps: obj.apr * 100,
          startDate: existing.lastClaimed,
          endDate: existing.endDate,
        });

        const updatedAmount = existing.amount + Number(amount);
        const updatedPending = (existing.reward || 0) + newReward;

        await trx
          .update(stakinglist)
          .set({
            amount: updatedAmount,
            reward: updatedPending,
            // startDate: obj?.startDate,
            // endDate: obj?.endDate,
            updatedAt: new Date(),
          })
          .where(eq(stakinglist.id, existing.id));
      } else {
        
        await trx.insert(stakinglist).values({
          amount,
          walletAddress: obj?.walletAddress,
          startDate: obj?.startDate,
          endDate: obj?.endDate,
          lastClaimed: obj?.startDate,
          userId: obj?.userId,
          stakeId: obj?.planId,
          reward: 0,
          type: "xp",
        });
      }
    });
   

  } catch (err) {
    console.log(`Attempt ${retry + 1} failed:`, err?.message);
    if (retry < 9) {
      setTimeout(checkTx, 3000, retry + 1, obj);
    } else {
      console.error("❌ Transaction not found after 10 attempts");
    }
  }
}

