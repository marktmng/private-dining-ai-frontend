"use client";

import {
  Mic,
  UtensilsCrossed,
  Receipt,
  Wine,
  BellRing,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export type ActiveView = "dial" | "menu" | "order" | "sommelier";

interface Props {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  orderCount?: number;
  onCalibrate?: () => void;
  onCallWaiter?: () => void;
  isCallingWaiter?: boolean;
}

export default function TacticalDock({
  activeView,
  onSelectView,
  orderCount = 0,
  onCalibrate,
  onCallWaiter,
  isCallingWaiter = false,
}: Props) {
  const navItems = [
    {
      id: "dial" as const,
      label: "Voice Core",
      icon: Mic,
      badge: null,
      color: "hover:text-[#22D3EE]",
    },
    {
      id: "menu" as const,
      label: "Menu Codex",
      icon: UtensilsCrossed,
      badge: null,
      color: "hover:text-[#B68A2D]",
    },
    {
      id: "order" as const,
      label: "Order Dispatch",
      icon: Receipt,
      badge: orderCount > 0 ? orderCount : null,
      color: "hover:text-[#10B981]",
    },
    {
      id: "sommelier" as const,
      label: "Sommelier AI",
      icon: Wine,
      badge: "AI",
      color: "hover:text-[#E5C378]",
    },
  ];

  return (
    <>
      {/* Desktop Vertical Dock (Left Rail as in Osiris) */}
      <aside className="hidden lg:flex flex-col items-center justify-between py-6 px-3 bg-[#191814]/90 backdrop-blur-md border-r border-[#B68A2D]/25 w-20 shrink-0 z-30 select-none">
        {/* Top Brand Logo / Reticle */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => onSelectView("dial")}>
          <div className="w-10 h-10 rounded-full border border-[#B68A2D] flex items-center justify-center bg-[#211F1A] shadow-[0_0_12px_rgba(182,138,45,0.3)] transition-transform group-hover:scale-110">
            <Sparkles className="w-5 h-5 text-[#B68A2D]" />
          </div>
          <span className="font-mono text-[9px] tracking-widest text-[#B68A2D] uppercase font-bold">
            AIVORA
          </span>
        </div>

        {/* Primary View Switcher Icons */}
        <nav className="flex flex-col items-center gap-4 my-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                title={item.label}
                className={`
                  relative w-12 h-12 rounded-xl flex items-center justify-center
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-[#2A261E] border border-[#B68A2D] text-[#E5C378] shadow-[0_0_15px_rgba(182,138,45,0.35)] scale-105"
                      : "bg-[#211F1A]/70 border border-[#B68A2D]/20 text-[#F3EFE6]/70 hover:text-white hover:border-[#B68A2D]/60 hover:bg-[#25221B]"
                  }
                `}
              >
                <Icon className="w-5 h-5" />

                {/* Badge (e.g. order item count) */}
                {item.badge !== null && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#B68A2D] text-[#191814] font-mono text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_#B68A2D]">
                    {item.badge}
                  </span>
                )}

                {/* Tooltip on hover */}
                <span className="absolute left-16 px-2.5 py-1 bg-[#211F1A] border border-[#B68A2D]/40 text-[#F3EFE6] font-mono text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Actions */}
        <div className="flex flex-col items-center gap-3">
          {/* Waiter Call Button */}
          <button
            type="button"
            onClick={onCallWaiter}
            title="Call Waiter"
            className={`
              relative w-11 h-11 rounded-xl flex items-center justify-center border transition-all
              ${
                isCallingWaiter
                  ? "bg-red-950/80 border-red-500 text-red-300 animate-pulse"
                  : "bg-[#211F1A] border-[#B68A2D]/30 text-[#B68A2D] hover:border-[#B68A2D] hover:text-[#E5C378]"
              }
            `}
          >
            <BellRing className="w-4 h-4" />
          </button>

          {/* Reboot / Calibrate Button */}
          {onCalibrate && (
            <button
              type="button"
              onClick={onCalibrate}
              title="Calibrate System Sensors"
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#211F1A] border border-[#B68A2D]/30 text-[#B68A2D]/70 hover:text-[#B68A2D] hover:border-[#B68A2D] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="w-5 h-[1px] bg-[#B68A2D]/30 my-1" />
          <span className="font-mono text-[9px] text-[#B68A2D]/60 tracking-wider">
            V5.0
          </span>
        </div>
      </aside>

      {/* Mobile / Tablet Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#191814]/95 backdrop-blur-xl border-t border-[#B68A2D]/30 py-2 px-4 flex items-center justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.7)] select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`
                relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors
                ${
                  isActive
                    ? "text-[#E5C378]"
                    : "text-[#F3EFE6]/60 hover:text-white"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-mono text-[10px] tracking-wider mt-1">
                {item.label.split(" ")[0]}
              </span>

              {item.badge !== null && (
                <span className="absolute top-0 right-2 min-w-3.5 h-3.5 px-1 rounded-full bg-[#B68A2D] text-[#191814] font-mono text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <span className="absolute -bottom-1 w-6 h-[2px] bg-[#B68A2D] rounded-full shadow-[0_0_6px_#B68A2D]" />
              )}
            </button>
          );
        })}

        {/* Waiter Call Button */}
        <button
          type="button"
          onClick={onCallWaiter}
          className={`flex flex-col items-center py-1 px-2 ${
            isCallingWaiter ? "text-red-400 animate-pulse" : "text-[#B68A2D]/80"
          }`}
        >
          <BellRing className="w-5 h-5" />
          <span className="font-mono text-[10px] tracking-wider mt-1">Call</span>
        </button>
      </nav>
    </>
  );
}
