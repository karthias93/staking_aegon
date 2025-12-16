import { ethers } from "ethers";
import StakingABI from "../../contract/staking.json"
//import {rpc} from "../../config/chain"
import { db, schema } from "../db/route";
import { eq } from "drizzle-orm";
// const BSC_TESTNET_RPC =  "https://sepolia.base.org";
const BSC_TESTNET_RPC =  process.env.RPC;

export function computeReward(amount: number, aprBps: number, startTime: number, endTime: number): number {
  let duration = endTime - startTime; // in seconds
  duration =duration>0?duration:0;
  console.log(duration,'durationdurationduration')
  const yearInSeconds = 365 * 24 * 60 * 60; // 365 days in seconds
  return (amount * aprBps * duration) / (10000 * yearInSeconds);
}

export function pendingReward(stake: {
  amount: number,
  aprBps: number,
  startDate: Date,
  endDate: Date
}): number {
    const now = Math.floor(Date.now() / 1000);
    const startTime = Math.floor(stake.startDate.getTime() / 1000);
    const endTime = Math.floor(stake.endDate.getTime() / 1000);
    const endOrNow = now < endTime ? now : endTime;
    return computeReward(stake.amount, stake.aprBps, startTime, endOrNow);
}

export async function getStakeInfo(
  id: number,
  walletAddress: string,
  days: number
): Promise<any> {
  try {
    
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    const stakingContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_STAKING_CONTRACT!,
      StakingABI,
      provider
    );

    const result = await stakingContract.stakesByTerm(id, walletAddress);

    const [
      termId,
      user,
      rawAmount,
      rawStart,
      rawEnd,
      aprBps,
      active,
      total
    ] = result;

    const amount = Number(rawAmount) / 1e18;
    let startDate = new Date(Number(rawStart) * 1000);
    let endDate = new Date(Number(rawEnd) * 1000);
    if(rawStart==0 && rawEnd==0){
        startDate = new Date();
        endDate = new Date(startDate.getTime() + days * 86400 * 1000);
    }

    return {
      termId: Number(termId),
      user,
      amount,
      startDate: startDate,
      endDate: endDate,
      aprBps: Number(aprBps),
      active: Number(active) === 1,
      total: Number(total) / 1e18,
    };
  } catch (err) {
    console.error("Error fetching stake info:", err);
    return null;
  }
}



export async function buildStakingHeaders(
  apiKey: string,
  apiSecret: string,
  body: object
): Promise<Record<string, string>> {
  const timestamp = getTimestamp();
  const nonce = generateNonce();
  const bodyStr = JSON.stringify(body);
  const message = apiKey + timestamp + nonce + bodyStr;
  const signature = await generateSignature(apiSecret, message);
  return {
    "x-api-key": apiKey,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": signature,
  };
}

export async function buildStakingHeaders1(
  apiKey: string,
  apiSecret: string,
  body: object
): Promise<Record<string, string>> {
  const timestamp = getTimestamp();
  const nonce = generateNonce();
  const bodyStr = JSON.stringify(body);
  const message = apiKey + timestamp + nonce+bodyStr;
  const signature = await generateSignature(apiSecret, message);
  return {
    "x-api-key": apiKey,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": signature,
  };
}

export async function generateSignature(
  secret: string,
  message: string
): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await window.crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(message)
    );
    return Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    const cryptoNode = require("crypto");
    return cryptoNode
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");
  }
}

export function generateNonce(): string {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    const cryptoNode = require("crypto");
    return cryptoNode.randomBytes(16).toString("hex");
  }
}

export function getTimestamp(): string {
  return Date.now().toString();
}


export async function xpBonus(walletAddress: string): Promise<boolean> {
  try {
    const apiKey = process.env.GAME_API_KEY;
    const apiSecret = process.env.GAME_API_SECRET;

    if (!apiKey || !apiSecret) {
      return false;
    }

    let isAirdrop = false;

    const xpbody = { 
      user_address: walletAddress, 
      xp: 10000, 
      pool: "join_bonus" 
    };
console.log(xpbody,'xpbodyxpbodyxpbody1212')
    const headers = await buildStakingHeaders(apiKey, apiSecret, xpbody);

    const res = await fetch("https://jungl-api.mybitverse.com/api/xp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(xpbody),
    });
    console.log(res,'resresres')
    if (res.ok) {
      await db
        .update(schema.users)
        .set({ airdrop: true })
        .where(eq(schema.users.walletAddress, walletAddress))
        .returning();

      isAirdrop = true;
    }

    return isAirdrop;
  } catch (err) {
    console.error("xpBonus error:", err);
    return false;
  }
}


export async function detectBalance(walletAddress: string,amount:number): Promise<boolean> {
  try {
    const apiKey = process.env.GAME_API_KEY;
    const apiSecret = process.env.GAME_API_SECRET;

    if (!apiKey || !apiSecret) {
      return false;
    }

    let isDetect = false;

    const xpbody = { 
      walletAddress, 
      amount
    };

    const headers = await buildStakingHeaders(apiKey, apiSecret, xpbody);

    const res = await fetch("https://jungl-api.mybitverse.com/api/xp/deduct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(xpbody),
    });
    //console.log(res,'888888888888888888888')
    if (res.ok) {
      await db
        .update(schema.users)
        .set({ airdrop: true })
        .where(eq(schema.users.walletAddress, walletAddress))
        .returning();

      isDetect = true;
    }

    return isDetect;
  } catch (err) {
    console.error("xpBonus error:", err);
    return false;
  }
}

export async function fetchXP(walletAddress: string): Promise<number> {
  try {
    const apiKey = process.env.GAME_API_KEY;
    const apiSecret = process.env.GAME_API_SECRET;

    if (!apiKey || !apiSecret) {
      return 0;
    }

    const xpquery = { walletAddress };
    const headers = await buildStakingHeaders1(apiKey, apiSecret, xpquery);

    const res = await fetch(
      `https://jungl-api.mybitverse.com/api/xp?walletAddress=${walletAddress}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        }
      }
    );

    if (!res.ok) {
      console.error("fetchXP failed:", res.status, res.statusText);
      return 0;
    }

    const data = await res.json();
    //console.log(data,'datadatadatadata')
    let balance = data && data.totalXP?data.totalXP:0
    return balance;
  } catch (err) {
    console.error("fetchXP error:", err);
    return 0;
  }
}


export async function claimBonus(walletAddress: string,amount:number,planId:number): Promise<boolean> {
  try {
    const apiKey = process.env.GAME_API_KEY;
    const apiSecret = process.env.GAME_API_SECRET;

    if (!apiKey || !apiSecret) {
      return false;
    }

    const xpbody = { 
      user_address: walletAddress, 
      xp: amount, 
      pool: `staking_aegon_${planId}`
    };
    console.log(xpbody,'xpbodyxpbodyxpbodyxpbody')
    const headers = await buildStakingHeaders(apiKey, apiSecret, xpbody);

    const res = await fetch("https://jungl-api.mybitverse.com/api/xp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(xpbody),
    });
    console.log(res,"resresresres")
    return res.ok || false;
  } catch (err) {
    console.error("xpBonus error:", err);
    return false;
  }
}