import { NextRequest } from "next/server";
import axios from "axios"
const Moralis = require('moralis').default;

export async function GET(req: NextRequest) {
  try {

      if (!Moralis.Core.isStarted) {
        await Moralis.start({
          apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY, 
        });
      }

      const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
      const ethpair = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";//uniswap

      const currentPriceResponse = await Moralis.EvmApi.token.getTokenPrice({
          address: wethAddress,
          chain: "0x1"
      });
      const currentPrice = currentPriceResponse?.raw?.usdPrice || 0;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const options = {
        method: 'GET',
        url: `https://deep-index.moralis.io/api/v2.2/pairs/${ethpair}/ohlcv`,
        params: {
            chain: 'eth',
            timeframe: '1h',
            currency: 'usd',
            fromDate: oneDayAgo.toISOString(),
            toDate: now.toISOString()
        },
        headers: {
            accept: 'application/json',
            'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY,
        }
      };
      const response = await axios.request(options);

      const formatted = {
          symbol: "BTC",
          currency: "usd",
          data: (response.data?.result || []).map((item: any) => ({
          value: String(item.close),
          timestamp: item.timestamp,
          }))
      };

      return new Response(
        JSON.stringify({ 
            success: true, 
            current: currentPrice,
            historical: formatted,
        }), 
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
  } catch (error) {
    console.error("fetcinh failed:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
   return new Response(
      JSON.stringify({ 
          success: true, 
          current: 0,
          historical: [],
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}