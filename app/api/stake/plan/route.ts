import { NextRequest,NextResponse  } from "next/server";
import { stakingplan} from "../../db/schema/user";
import { db } from "../../db/route";

export async function GET(req: NextRequest) {
  try {
    const plan = await db
      .select()
      .from(stakingplan);

    return NextResponse.json({ success: true, data: plan, msg: "fetched staking plan" });
  } catch (error) {
    console.error("Insert failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}