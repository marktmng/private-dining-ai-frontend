"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/types/order";
import { Sparkles, Utensils, ChefHat, BarChart3, LogIn, LogOut, Radio } from "lucide-react";

interface Props {
  user?: AuthUser | null;
  restaurantName?: string;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
  menuItemCount?: number;
  currentPath?: "/customer" | "/kitchen" | "/admin";
}

export default function TacticalHeader({
  user,
  restaurantName,
  onSignOut,
  onOpenLogin,
  menuItemCount = 0,
  currentPath = "/customer",
}: Props) {
  const isAuthenticated = !!user;
  const [zuluTime, setZuluTime] = useState<string>("ZULU 00:00:00Z");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");
      setZuluTime(`ZULU ${hours}:${minutes}:${seconds}Z`);
    }

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-[#191814]/95 backdrop-blur-md border-b border-[#B68A2D]/25 px-4 sm:px-6 py-3 select-none z-30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Brand Unit */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <Link href="/customer" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#211F1A] border border-[#B68A2D] flex items-center justify-center shadow-[0_0_10px_rgba(182,138,45,0.4)] group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-[#B68A2D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-[0.2em] text-[#F3EFE6] group-hover:text-[#E5C378] transition-colors">
                  A I V O R A
                </span>
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-[#B68A2D]/20 text-[#B68A2D] border border-[#B68A2D]/40">
                  V5.0
                </span>
              </div>
              <p className="font-mono text-[9px] tracking-widest text-[#B68A2D]/80 uppercase">
                Private Dining Intelligence
              </p>
            </div>
          </Link>

          {/* Mobile Auth Button */}
          <div className="md:hidden flex items-center gap-2">
            <nav className="flex items-center bg-[#201E19] border border-[#B68A2D]/30 rounded-lg p-0.5 font-mono text-[10px]">
              <Link
                href="/customer"
                className={`px-2 py-0.5 rounded ${
                  currentPath === "/customer"
                    ? "bg-[#B68A2D] text-[#191814] font-bold"
                    : "text-[#F3EFE6]/70"
                }`}
              >
                Dine
              </Link>
              <Link
                href="/kitchen"
                className={`px-2 py-0.5 rounded ${
                  currentPath === "/kitchen"
                    ? "bg-[#B68A2D] text-[#191814] font-bold"
                    : "text-[#F3EFE6]/70"
                }`}
              >
                KDS
              </Link>
              <Link
                href="/admin"
                className={`px-2 py-0.5 rounded ${
                  currentPath === "/admin"
                    ? "bg-[#B68A2D] text-[#191814] font-bold"
                    : "text-[#F3EFE6]/70"
                }`}
              >
                Mgr
              </Link>
            </nav>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={onSignOut}
                className="font-mono text-[10px] text-[#B68A2D] hover:text-[#F3EFE6] flex items-center gap-1 border border-[#B68A2D]/30 px-2 py-1 rounded"
              >
                <LogOut className="w-3 h-3" />
                <span>{restaurantName || "Rest A"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="font-mono text-[10px] bg-[#B68A2D] text-[#191814] font-bold px-2 py-1 rounded shadow"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Center Osiris-style Telemetry HUD Bar */}
        <div className="hidden sm:flex items-center gap-3 md:gap-4 font-mono text-[11px] text-[#B68A2D] bg-[#201E19]/80 border border-[#B68A2D]/20 px-4 py-1.5 rounded-full overflow-x-auto max-w-full">
          {/* Zulu Clock */}
          <span className="text-[#22D3EE] font-bold tracking-wider">{zuluTime}</span>

          <span className="text-[#B68A2D]/30">•</span>

          {/* Live Status Indicator */}
          <div className="flex items-center gap-1.5 text-[#10B981]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="font-bold">STATUS: LIVE</span>
          </div>

          <span className="text-[#B68A2D]/30">•</span>

          {/* Menu Count */}
          <span>
            MENU: <span className="text-[#F3EFE6] font-semibold">{menuItemCount} ITEMS</span>
          </span>

          <span className="text-[#B68A2D]/30">•</span>

          {/* Location / View Tag */}
          <span className="text-[#E5C378]">
            {currentPath === "/kitchen"
              ? "KITCHEN DISPLAY // KDS-01"
              : currentPath === "/admin"
              ? "MANAGEMENT PORTAL // OPS"
              : "TABLE: VIP SUITE 01"}
          </span>

          <span className="text-[#B68A2D]/30">•</span>

          {/* Audio Engine */}
          <span className="text-[#22D3EE] flex items-center gap-1">
            <Radio className="w-3 h-3" />
            <span>48kHz WEBRTC</span>
          </span>
        </div>

        {/* Right Navigation & SaaS Auth Status */}
        <div className="hidden md:flex items-center gap-3">
          {/* App Switcher Tabs */}
          <nav className="flex items-center bg-[#201E19] border border-[#B68A2D]/30 rounded-lg p-0.5 font-mono text-xs">
            <Link
              href="/customer"
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                currentPath === "/customer"
                  ? "text-[#E5C378] bg-[#2B271F] border border-[#B68A2D]/50 shadow-sm font-bold"
                  : "text-[#F3EFE6]/70 hover:text-[#F3EFE6] hover:bg-[#28251E]"
              }`}
            >
              <Utensils className="w-3 h-3 text-[#B68A2D]" />
              <span>Dine</span>
            </Link>
            <Link
              href="/kitchen"
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                currentPath === "/kitchen"
                  ? "text-[#10B981] bg-[#17261E] border border-[#10B981]/50 shadow-sm font-bold"
                  : "text-[#F3EFE6]/70 hover:text-[#F3EFE6] hover:bg-[#28251E]"
              }`}
            >
              <ChefHat className="w-3 h-3 text-[#10B981]" />
              <span>Kitchen</span>
            </Link>
            <Link
              href="/admin"
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                currentPath === "/admin"
                  ? "text-[#22D3EE] bg-[#17252E] border border-[#22D3EE]/50 shadow-sm font-bold"
                  : "text-[#F3EFE6]/70 hover:text-[#F3EFE6] hover:bg-[#28251E]"
              }`}
            >
              <BarChart3 className="w-3 h-3 text-[#22D3EE]" />
              <span>Manager</span>
            </Link>
          </nav>

          {/* Auth Status Card */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-[#201E19] border border-[#10B981]/40 rounded-lg px-3 py-1 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <div className="text-left leading-tight">
                <span className="text-[#10B981] font-bold block">
                  {restaurantName || "Restaurant A"}
                </span>
                <span className="text-[#B68A2D]/60 text-[9px] block">
                  {user.email.split("@")[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="ml-1 p-1 text-[#B68A2D]/60 hover:text-white rounded hover:bg-[#2A2720]"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#201E19] border border-[#B68A2D]/30 rounded-lg px-3 py-1 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="text-[#E5C378]">Prototype</span>
              <button
                type="button"
                onClick={onOpenLogin}
                className="ml-1 px-2.5 py-1 bg-[#B68A2D] hover:bg-[#C89B37] text-[#191814] font-bold rounded text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
