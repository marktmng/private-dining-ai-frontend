"use client";

import { useEffect, useState } from "react";
import { Radio, ShieldCheck, Cpu } from "lucide-react";

export default function TacticalTicker() {
  const [coords, setCoords] = useState({ x: 37.7749, y: -122.4194 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = Number(((e.clientX / window.innerWidth) * 100).toFixed(4));
      const y = Number(((e.clientY / window.innerHeight) * 100).toFixed(4));
      setCoords({ x, y });
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const tickerItems = [
    { dot: "bg-[#10B981]", text: "AI VOICE STREAM: ONLINE (48kHz WEBRTC)" },
    { dot: "bg-[#E5C378]", text: "CHEF SPECIAL: A5 MIYAZAKI WAGYU & WINTER TRUFFLE" },
    { dot: "bg-[#22D3EE]", text: "KITCHEN TELEMETRY: REALTIME DISPATCH READY" },
    { dot: "bg-[#10B981]", text: "DATABASE SYNC: SUPABASE POSTGRES ACTIVE" },
    { dot: "bg-[#F59E0B]", text: "SOMMELIER: CELLAR SELECTIONS CALIBRATED" },
    { dot: "bg-[#10B981]", text: "ACOUSTIC SENSORS: AMBIENT SUPPRESSION 98%" },
  ];

  return (
    <footer className="w-full bg-[#141310] border-t border-[#B68A2D]/20 py-1.5 px-4 font-mono text-[10px] text-[#B68A2D] flex items-center justify-between overflow-hidden select-none z-30">
      {/* Left Coordinates & Telemetry */}
      <div className="hidden md:flex items-center gap-3 shrink-0 pr-4 border-r border-[#B68A2D]/20">
        <span className="flex items-center gap-1 text-[#22D3EE]">
          <Cpu className="w-3 h-3" />
          <span>CURSOR {coords.x}, {coords.y}</span>
        </span>
        <span className="text-[#B68A2D]/40">•</span>
        <span className="text-[#F3EFE6]/70">SUITE VIP-01</span>
      </div>

      {/* Middle Marquee Ticker Tape */}
      <div className="flex-1 overflow-hidden mx-2 sm:mx-4">
        <div className="animate-ticker flex items-center gap-8 whitespace-nowrap">
          {/* Duplicate list to create seamless infinite ticker */}
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
              <span className="text-[#F3EFE6]/80">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Security & Status */}
      <div className="hidden sm:flex items-center gap-2 shrink-0 pl-4 border-l border-[#B68A2D]/20 text-[#10B981]">
        <ShieldCheck className="w-3 h-3" />
        <span className="font-bold">ENCRYPTED // ONLINE</span>
      </div>
    </footer>
  );
}
