import { NextResponse } from "next/server";
import ky from "ky";

const basicAuth = Buffer.from(
  `${process.env.CLAIM_USERNAME}:${process.env.CLAIM_PASSWORD}`
).toString("base64");

const claimKy = ky.create({
  prefixUrl: process.env.CLAIM_URL,
  headers: {
    Authorization: `Basic ${basicAuth}`,
  },
});


export async function POST(req: Request) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // const amount = 10;
    let body = {
      walletAddress,
      amount: 10,
    };

    const response = await claimKy.post("api/staking/add", {
      json: body,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("Deduct Error:", error);
    return NextResponse.json(
      { error: "Something went wrong", details: error.message },
      { status: 500 }
    );
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
