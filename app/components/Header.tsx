"use client";

import React, { useState } from "react";
import { RiTwitterXLine } from "react-icons/ri";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import Image from "next/image";
import WalletButton from "./WalletConnect";
import { useRouter } from "next/navigation";

export default function Header({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState("Lobby");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <div className="flex h-screen bg-[#022222] text-white font-College">
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            {/* Left - Logo */}
            <div className="flex items-center gap-2 md:!m-4">
              <a href="/"><Image
                src="/images/AEGON.svg"
                alt="Logo"
                width={120}
                height={48}
                className="h-10 w-auto"
              />
              </a>
            </div>

            <div className="hidden md:flex items-center text-[#FFFFFF] text-lg gap-12 font-bold">
              {["Stake"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "Stake") {
                      router.push("/staking");
                    } else if (tab === "Game") {
                      router.push("/games");
                    }
                  }}
                  className={`px-3 py-1 rounded transition ${
                    activeTab === tab
                      ? "bg-[#106F70] text-white"
                      : "hover:text-[#36FCE5]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-4">
              <a
                href="https://aegonai.substack.com/p/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-[#FFFFFF] to-[#3F9C9D] 
             hover:from-[#3F9C9D] hover:to-[#FFFFFF] text-[#011530] px-5 py-2 font-bold text-xl transition"
              >
                Docs
              </a>
              <WalletButton />
              <button>
                <RiTwitterXLine
                  className="text-[#C5F2EE] hover:text-[#36FCE5] transition"
                  size={20}
                />
              </button>
            </div>

            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-white"
            >
              <HiMenuAlt3 size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* <div
              className="fixed inset-0 bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            /> */}

            <div className="ml-auto w-[300px] bg-[#1e1e2f] h-full shadow-xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <HiX size={26} className="text-gray-300 hover:text-white" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {["Stake"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSidebarOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-left font-semibold transition ${
                      activeTab === tab
                        ? "bg-[#106F70] text-white"
                        : "hover:text-[#36FCE5]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <a
                  href="https://aegonai.substack.com/p/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-[#36FCE5] to-[#5EF7CB] text-black hover:opacity-90 px-4 py-2 rounded font-medium transition"
                >
                  Docs
                </a>
                <WalletButton />
                <button>
                  <RiTwitterXLine
                    className="text-[#C5F2EE] hover:text-[#36FCE5] transition"
                    size={20}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
