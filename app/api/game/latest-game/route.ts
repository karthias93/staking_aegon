import { NextResponse } from "next/server";
import { db } from "../../../lib/db/db";
import { games } from "../../../lib/db/schema/user";
import { eq,desc } from "drizzle-orm";
import {fetchXP} from "../../lib/stake";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress} = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const userGames = await db
      .select()
      .from(games)
      .where(eq(games.creatorWallet, walletAddress))
      .orderBy(desc(games.createdAt))
      .limit(1);

    let canCreate = true;

    if (userGames.length > 0) {
      const lastCreatedAt = new Date(userGames[0].createdAt);
      const now = new Date();

      const diffHours =
        (now.getTime() - lastCreatedAt.getTime()) / (1000 * 60 * 60);

      canCreate = diffHours >= 24;
    }

    let balance = await fetchXP(walletAddress);
    console.log(balance,'balancebalancebalance',walletAddress)
    return NextResponse.json({
      success: true,
      canCreate,
      isBalance:(balance>=7000),
      balance
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      canCreate:false,
      isBalance:false,
      balance:0
    });
  }
}
