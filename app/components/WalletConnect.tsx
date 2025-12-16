"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { useWallet } from "../context/WalletContext";
import { useXp } from "../context/XpContext";
import { chainId } from "../config/chain";
import { SiweMessage } from "siwe";
import { toFixedTrunc } from "../utils/helper";

export default function WalletButton() {
  const { connect, connectors, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { xpbalance,reloadXP } = useXp();
  const { address, isConnected } = useAccount();
  const { setWalletAddress } = useWallet();
  const { signMessageAsync } = useSignMessage();

  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);
  const [username, setUsername] = useState("");
  const [showBonus, setshowBonus] = useState(false);
  const [showBetaPact, setShowBetaPact] = useState(false);

  const hasWelcomed = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    } else {
      setWalletAddress(null);
    }
  }, [isConnected, address, setWalletAddress]);

  const shortenAddress = (addr: string) =>
    addr ? `${addr.slice(0, 5)}...${addr.slice(-5)}` : "";

  const handleUsernameSubmit = async () => {
    if (!username) return toast.error("Please enter a username");

    try {
      const response = await axios.post("/api/user", {
        username,
        walletAddress: address,
      });

      console.log(response, "responseresponseresponse");

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
      }

      if (response.data?.message) {
        toast.success(response.data.message);
      }

      setShowUsernamePopup(false);

      if (response.data?.isairdrop) {
        setshowBonus(true);
        reloadXP();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create user");
    }
  };

  useEffect(() => {
    const checkAuthUser = async () => {
      if (!isConnected || !address) return;

      try {
        const res = await axios.get("/api/user", {
          params: { walletAddress: address },
        });

        if (res.data?.user && res.data?.token) {
          localStorage.setItem("authToken", res.data.token);
          localStorage.setItem("userId", res.data.user.id);

          if (!hasWelcomed.current) {
            toast.success(`Welcome back ${res.data.user.username}!`);
            hasWelcomed.current = true;
          }
          setShowUsernamePopup(false);

          if (res.data?.isairdrop) {
            setshowBonus(true);
            reloadXP()
          }

        } else {
          setShowBetaPact(true);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setShowBetaPact(true);
        } else {
          console.error(err);
          toast.error("Error checking user");
        }
      }
    };

    checkAuthUser();
  }, [isConnected, address]);

  const handleConnectAndSignIn = async (connector: any) => {
    try {
      const result = await connectAsync({ connector, chainId });
      console.log(result, "resultresultresultresult");
      const nonce = new Date().getTime().toString();
      const message = new SiweMessage({
        domain: window.location.host,
        address: result.accounts[0],
        statement:
          "By signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.",
        uri: window.location.origin,
        version: "1",
        chainId: chainId,
        nonce,
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });
      if (signature) {
        setIsOpen(false);
      }
       reloadXP()
    } catch (err) {
      console.error("Error connecting/signing:", err);
      disconnect();
    }
  };

  if (isConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-block bg-gradient-to-r from-[#FFFFFF] to-[#3F9C9D] 
             hover:from-[#3F9C9D] hover:to-[#FFFFFF] 
             text-[#011530] px-6 py-2 font-bold text-xl 
             transition-colors duration-300"
        >
          {shortenAddress(address!)}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-[#1e1e2f] rounded-lg shadow-lg border border-gray-700 z-50">
            <button
              onClick={() => {
                setShowDropdown(false);
                router.push("/profile");
              }}
              className="block w-full text-left font-semibold text-lg px-4 py-2 text-white hover:bg-[#106F70] rounded-t-lg transition"
            >
              Profile
            </button>
            <p className="block w-full text-left font-semibold text-lg px-4 py-2 text-white hover:bg-[#106F70] rounded-t-lg transition">
              Balance : {toFixedTrunc(xpbalance, 5)} XP
            </p>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 font-semibold text-lg text-red-400 hover:bg-red-600 hover:text-white rounded-b-lg transition"
            >
              Disconnect
            </button>
          </div>
        )}

        {showBetaPact && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center py-10 px-4">
              <div className="bg-[#000508] shadow-xl p-6 sm:p-10 w-full max-w-lg text-cyan-300 text-center border border-cyan-300 rounded-md">
                <h1 className="text-xl sm:text-2xl font-extrabold mb-2 leading-snug">
                  ⚔️ THE AEGON BETA PACT ⚔️
                </h1>
                <p className="text-xs sm:text-sm italic mb-4">
                  v0.1.0 — Closed Beta
                </p>

                <ul className="text-left text-sm sm:text-base space-y-2 mb-6">
                  <li>• You hold 35,000 $AEGON, the key to my gates.</li>
                  <li>• I grant you 10,000 XP on your first login.</li>
                  <li>• You may forge one game per day — no more.</li>
                  <li>• Each creation demands a tribute of 7,000 XP.</li>
                  <li>
                    • Your Game Ownership NFTs live in testnet shadows for now.
                  </li>
                  {/* <li>
                    • Until my next update, your creations remain hidden from
                    public page.
                  </li> */}
                </ul>

                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  {/* Accept button */}
                  <button
                    onClick={() => {
                      setShowBetaPact(false);
                      setShowUsernamePopup(true);
                    }}
                    className="relative px-4 sm:px-6 py-2 sm:py-3 font-bold tracking-wide uppercase text-cyan-300
                       bg-[#011530] transition-all duration-300 cursor-pointer
                       [clip-path:polygon(10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px),0_10px)]
                       hover:text-cyan-100"
                  >
                    I ACCEPT AEGON'S PACT
                    <span className="absolute inset-0 border-2 border-cyan-800 pointer-events-none [clip-path:inherit]"></span>
                    <span className="absolute inset-1 border-2 border-cyan-400 pointer-events-none [clip-path:inherit] transition-colors duration-300 hover:border-cyan-200 hover:shadow-[0_0_12px_#3FE2E2]"></span>
                  </button>

                  {/* Flee button */}
                  <button
                    onClick={() => {
                      setShowBetaPact(false);
                      disconnect();
                    }}
                    className="relative px-4 sm:px-6 py-2 sm:py-3 font-bold tracking-wide uppercase text-red-300
                       bg-[#2a0000] transition-all duration-300 cursor-pointer
                       [clip-path:polygon(10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px),0_10px)]
                       hover:text-red-100"
                  >
                    I FLEE LIKE A COWARD
                    <span className="absolute inset-0 border-2 border-red-800 pointer-events-none [clip-path:inherit]"></span>
                    <span className="absolute inset-1 border-2 border-red-400 pointer-events-none [clip-path:inherit] transition-colors duration-300 hover:border-red-200 hover:shadow-[0_0_12px_#ff4d4d]"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUsernamePopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
            <div className="bg-[#1e1e2f] rounded-2xl shadow-xl p-6 w-80">
              <h2 className="text-lg font-semibold mb-4 text-white">
                Enter your username
              </h2>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 mb-4 rounded-lg border border-white text-white placeholder-white"
                placeholder="Username"
              />
              <button
                onClick={handleUsernameSubmit}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFFFFF] to-[#3F9C9D] font-bold text-xl transition"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
        {showBonus && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
            <div className="bg-[#1e1e2f] rounded-2xl shadow-2xl w-full max-w-sm mx-auto text-center relative">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
                🎉Congratulations!🎉
              </h2>
              <p className="text-white text-base sm:text-lg mb-6 px-2">
                Awesome!{" "}
                <span className="font-bold text-teal-400">10,000 XP</span> has
                just been credited to your account ✨
              </p>
              <button
                onClick={() => setshowBonus(false)}
                className="mt-4  px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-block bg-gradient-to-r from-[#FFFFFF] to-[#3F9C9D] 
             hover:from-[#3F9C9D] hover:to-[#FFFFFF] 
             text-[#011530] px-6 py-2 font-bold text-xl 
             transition-colors duration-300"
      >
        Connect Wallet
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-[#1e1e2f] rounded-2xl shadow-xl p-6 w-80">
            <h2 className="text-lg font-semibold mb-4 text-white">
              Choose Wallet
            </h2>

            <div className="flex flex-col gap-3">
              {connectors
                .filter(
                  (c) =>
                    !c.name.toLowerCase().includes("meta") &&
                    !c.name.toLowerCase().includes("injected") &&
                    !c.name.toLowerCase().includes("walletconnect")
                )
                .map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => handleConnectAndSignIn(connector)}
                    className="inline-block bg-gradient-to-r from-[#FFFFFF] to-[#3F9C9D] 
                      hover:from-[#3F9C9D] hover:to-[#FFFFFF] 
                      text-black px-4 py-2 font-bold text-xl 
                      transition-colors duration-300 rounded-lg"
                  >
                    {connector.name}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
