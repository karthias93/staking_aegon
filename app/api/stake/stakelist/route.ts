import { NextRequest,NextResponse  } from "next/server";
import { stakinglist,stakingplan,claimedrewards} from "../../../lib/db/schema/user";
import { db } from "../../../lib/db/db";
import { and, eq,desc,ne} from "drizzle-orm";
import {claimBonus,xpBonus} from "../../lib/stake"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;
    const list = await db
    .select()
    .from(stakinglist)
    .where(
      and(
        eq(stakinglist.walletAddress, walletAddress)
      )
    )
    .orderBy(desc(stakinglist.endDate));

    const plan = await db
          .select()
          .from(stakingplan);


    return NextResponse.json({ success: true, data: list,plan:plan, msg: "fetched staking list" });
  } catch (error) {
    console.error("Insert failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function GET(req: NextRequest) {
  try {
    
    const claims = await db
      .select()
      .from(claimedrewards)
      .where(
      and(
        ne(claimedrewards.walletAddress, "0x209D0beeE1c4b795097924d22d4BAca427B393B0")
      )
    )
      .orderBy(desc(claimedrewards.createdAt));

    if (!claims.length) {
      return NextResponse.json({ success: false, msg: "No claimed rewards found" });
    }

    const results = [];

    // 2. Loop through each claimed reward and call claimBonus
    for (const claim of claims) {
      const amount = claim.reward ?? 0;
      const stakeId = claim.stakeId;
      const walletAddress = claim.walletAddress;

      //const bonus = await claimBonus(walletAddress, amount, stakeId);

      results.push({
        claimId: claim.id,
        stakeId,
        amount,
      //  bonus,
      });
    }

    //let resp = await xpBonus("0xD6D27f06BC58d2d77669D6395f99b778b4a4FF9C")

    // 3. Return all results
    return NextResponse.json({
      success: true,
      msg: "Processed claimed rewards",
      results,
    });
  } catch (error) {
    console.error("ClaimBonus loop failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
