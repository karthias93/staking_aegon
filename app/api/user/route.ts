import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../lib/db/db";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { settings } from "../../lib/db/schema/user";
import ERC20_ABI from "../../contract/Erc20.json";
import jwt from "jsonwebtoken";
import { xpBonus } from "../lib/stake";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, walletAddress } = body;

    if (!username || !walletAddress) {
      return NextResponse.json(
        { error: "username and walletAddress are required" },
        { status: 400 }
      );
    }

    let isairdrop = false;
    let user;

    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress))
      .limit(1);

    if (existingUser.length > 0) {
      user = existingUser[0];

      if (!user.airdrop) {
        let balance = await getTokenBalance(walletAddress);
        const allSettings = await db
          .select()
          .from(settings)
          .where(eq(settings.key, "bonus_amount"))
          .limit(1);

        if (
          allSettings &&
          allSettings[0] &&
          balance >= Number(allSettings[0].value)
        ) {
          isairdrop = await xpBonus(walletAddress);
          if (isairdrop) {
            await db
              .update(schema.users)
              .set({ airdrop: true })
              .where(eq(schema.users.walletAddress, walletAddress));
            user.airdrop = true;
          }
        }
      }

      const token = jwt.sign(
        { id: user.id, walletAddress: user.walletAddress },
        process.env.JWT_SECRET || "supersecret",
        { expiresIn: "1h" }
      );

      return NextResponse.json(
        { message: "User already exists", user, isairdrop, token },
        { status: 200 }
      );
    }

    const newUser = await db
      .insert(schema.users)
      .values({
        username,
        walletAddress: walletAddress,
      })
      .returning();

    user = newUser[0];

    let balance = await getTokenBalance(walletAddress);
    let allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "bonus_amount"))
      .limit(1);

    if (
      allSettings &&
      allSettings[0] &&
      balance >= Number(allSettings[0].value)
    ) {
      isairdrop = await xpBonus(walletAddress);
      if (isairdrop) {
        await db
          .update(schema.users)
          .set({ airdrop: true })
          .where(eq(schema.users.walletAddress, walletAddress));
        user.airdrop = true;
      }
    }

    const token = jwt.sign(
      { id: user.id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1h" }
    );

    return NextResponse.json(
      { message: "User created", user, isairdrop, token },
      { status: 201 }
    );
  } catch (err) {
    console.error(err, "adduser errrr");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    console.log('12');
    const walletAddress = searchParams.get("walletAddress");

    console.log('11');
    if (!walletAddress) {
      
    console.log('2');
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    console.log('3');
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.walletAddress, walletAddress))
      .limit(1);

    console.log('4');
    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log('5');
    let isairdrop = false;
    if (!user[0].airdrop) {
    console.log('6');
      let balance = await getTokenBalance(walletAddress);
    console.log('7');
      const allSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "bonus_amount"))
        .limit(1);

    console.log('8');
      if (
        allSettings &&
        allSettings[0] &&
        balance >= Number(allSettings[0].value)
      ) {
        isairdrop = await xpBonus(walletAddress);
    console.log('9');
        if (isairdrop) {
          await db
            .update(schema.users)
            .set({ airdrop: true })
            .where(eq(schema.users.walletAddress, walletAddress));
          isairdrop = true;
        }
      }
    }

    const payload = {
      id: user[0].id,
      walletAddress: user[0].walletAddress,
      username: user[0].username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || "supersecret", {
      expiresIn: "1h",
    });

    return NextResponse.json(
      { user: user[0], token, isairdrop },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function getTokenBalance(userAddress: string) {
  console.log('a1')
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  console.log('a2', provider)
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_TOKEN_CONTRACT as string,
    ERC20_ABI,
    provider
  );
  console.log('a3', contract)

  const [rawBalance, decimals] = await Promise.all([
    contract.balanceOf(userAddress),
    contract.decimals(),
  ]);
  console.log('a4', Number(ethers.formatUnits(rawBalance, decimals)))

  return Number(ethers.formatUnits(rawBalance, decimals));
}
