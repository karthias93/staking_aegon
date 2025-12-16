import { NextRequest } from "next/server";
import axios from "axios"
const Moralis = require('moralis').default;

let moralisStarted = false;

export async function GET(req: NextRequest) {
  try {
      if (!moralisStarted) {
        await Moralis.start({
          apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
        });
      }

      moralisStarted = true;

       const options = {
            method: 'POST',
            url : process.env.NEXT_PUBLIC_RPC,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json'
            },
            data: JSON.stringify({
                "jsonrpc": "2.0",
                "id": "1",
                "method": "eth_gasPrice"
            })
        };
        const response:any = await axios.request(options);
        let baseFeeWei = parseInt(response?.data?.result) || 1e9;
        let baseFeeGwei = baseFeeWei / 1e9;
    
        let obj= {
          success: true, 
            low: (baseFeeGwei * 0.9).toFixed(4),
            medium: (baseFeeGwei*1.1).toFixed(4),
            fast: (baseFeeGwei * 2).toFixed(4),
            baseFee: baseFeeGwei.toFixed(4),
        };
      return new Response(
        JSON.stringify(obj), 
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
  } catch (error) {
    console.error("fetcinh failed:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    let baseFeeGwei = 1 / 1e9;
    let obj= {
      success: true, 
      low: (baseFeeGwei * 0.9).toFixed(4),
      medium: (baseFeeGwei).toFixed(4),
      fast: (baseFeeGwei * 1.1).toFixed(4),
      baseFee: baseFeeGwei.toFixed(4),
    };

   return new Response(
      JSON.stringify(obj), 
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}