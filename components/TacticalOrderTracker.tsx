"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { animate } from "animejs";
import {
  Sparkles,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UtensilsCrossed,
  ChefHat,
  Compass,
  Layers,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Flame,
  Radio,
  PlusCircle,
  Receipt,
  Printer,
  Copy,
  Check,
  X,
} from "lucide-react";
import type { PersistedOrder, OrderStatus } from "@/types/order";
import { getGuestOrder, trackOrderPublic } from "@/lib/api";

interface Props {
  initialOrder: PersistedOrder;
  sessionToken?: string;
  onClose?: () => void;
  onOrderMore?: () => void;
  currencySymbol?: string;
}

export default function TacticalOrderTracker({
  initialOrder,
  sessionToken,
  onClose,
  onOrderMore,
  currencySymbol = "$",
}: Props) {
  const [order, setOrder] = useState<PersistedOrder>(initialOrder);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [zuluTime, setZuluTime] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [latencyMs, setLatencyMs] = useState(14);
  const [syncCount, setSyncCount] = useState(0);

  // SVG and Anime.js references
  const radarSweepRef = useRef<SVGGElement>(null);
  const progressRingRef = useRef<SVGCircleElement>(null);
  const orbitalNode1Ref = useRef<SVGCircleElement>(null);
  const orbitalNode2Ref = useRef<SVGCircleElement>(null);
  const beaconPulseRef = useRef<SVGCircleElement>(null);

  // Live Zulu Time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(
        now.toISOString().substring(11, 19) + "Z"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend for real order status (Never advances independently)
  const syncOrder = useCallback(async () => {
    try {
      setIsSyncing(true);
      const start = performance.now();
      let updated: PersistedOrder;
      if (sessionToken) {
        updated = await getGuestOrder(order.id, sessionToken);
      } else {
        updated = await trackOrderPublic(order.id);
      }
      const dur = Math.round(performance.now() - start);
      setLatencyMs(Math.max(8, dur));
      setOrder(updated);
      setLastSyncTime(new Date());
      setSyncCount((prev) => prev + 1);
    } catch (err) {
      console.warn("Telemetry sync retry:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [order.id, sessionToken]);

  // Live SSE listener for instantaneous kitchen action telemetry
  useEffect(() => {
    if (!order.id) return;
    if (order.status === "COMPLETED" || order.status === "CANCELLED") return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const sseUrl = `${apiBase}/guest/track/${order.id}/stream`;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("order:status", (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.status) {
            setOrder((prev) => ({
              ...prev,
              status: payload.status,
              ...(payload.order ? payload.order : {}),
            }));
            setLastSyncTime(new Date());
            setSyncCount((c) => c + 1);
          }
        } catch (err) {
          console.warn("Telemetry parse error:", err);
        }
      });

      eventSource.addEventListener("connected", (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.order) {
            setOrder(payload.order);
            setLastSyncTime(new Date());
          }
        } catch (err) {
          console.warn("Telemetry init error:", err);
        }
      });

      eventSource.onerror = () => {
        // Fallback polling handles updates if SSE is interrupted
      };
    } catch (err) {
      console.warn("EventSource init error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [order.id, order.status]);

  useEffect(() => {
    // Poll every 4 seconds if order is not completed/cancelled as resilient backup
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      return;
    }
    const interval = setInterval(() => {
      void syncOrder();
    }, 4000);
    return () => clearInterval(interval);
  }, [order.status, syncOrder]);

  // Anime.js animations strictly tied to real backend status
  useEffect(() => {
    const status = order.status;

    // 1. Radar Sweep for PREPARING / SENT_TO_KITCHEN
    if (radarSweepRef.current) {
      if (status === "PREPARING" || status === "SENT_TO_KITCHEN") {
        animate(radarSweepRef.current, {
          rotate: [0, 360],
          duration: 3200,
          loop: true,
          ease: "linear",
        });
      } else {
        animate(radarSweepRef.current, {
          rotate: 0,
          duration: 400,
          ease: "easeOutQuad",
        });
      }
    }

    // 2. Beacon Pulsing for READY / EXPEDITION
    if (beaconPulseRef.current) {
      if (status === "READY") {
        animate(beaconPulseRef.current, {
          scale: [1, 1.4, 1],
          opacity: [0.9, 0.2, 0.9],
          duration: 1400,
          loop: true,
          ease: "easeInOutSine",
        });
      } else {
        animate(beaconPulseRef.current, {
          scale: 1,
          opacity: 0.3,
          duration: 300,
        });
      }
    }

    // 3. Orbital Telemetry Satellites
    if (orbitalNode1Ref.current) {
      animate(orbitalNode1Ref.current, {
        opacity: status === "COMPLETED" ? 1 : [0.4, 1, 0.4],
        scale: status === "COMPLETED" ? 1.2 : [0.9, 1.2, 0.9],
        duration: 2000,
        loop: true,
        ease: "easeInOutSine",
      });
    }

    if (orbitalNode2Ref.current) {
      animate(orbitalNode2Ref.current, {
        opacity: status === "COMPLETED" ? 1 : [0.5, 1, 0.5],
        scale: status === "COMPLETED" ? 1.2 : [1, 1.3, 1],
        duration: 2600,
        loop: true,
        ease: "easeInOutSine",
      });
    }

    // 4. Progress Arc stroke animation based on status
    if (progressRingRef.current) {
      let targetOffset = 440; // Empty
      if (status === "PENDING") targetOffset = 330;
      else if (status === "ACCEPTED" || status === "CONFIRMED") targetOffset = 260;
      else if (status === "SENT_TO_KITCHEN" || status === "PREPARING") targetOffset = 130;
      else if (status === "READY") targetOffset = 40;
      else if (status === "COMPLETED") targetOffset = 0;

      animate(progressRingRef.current, {
        strokeDashoffset: targetOffset,
        duration: 1200,
        ease: "cubicBezier(0.25, 1, 0.5, 1)",
      });
    }
  }, [order.status]);

  // Compute status configuration strictly grounded in backend order.status
  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return {
          telemetryLabel: "TELEMETRY // ORDER TRANSMITTED",
          headline: "Order Transmitted",
          message: "Your order has been transmitted. Awaiting kitchen acknowledgement.",
          badgeColor: "text-amber-400 border-amber-500/40 bg-amber-950/40",
          glowColor: "rgba(245, 158, 11, 0.25)",
          accentHex: "#F59E0B",
          indicatorType: "transmitting",
          stepIndex: 0,
        };
      case "ACCEPTED":
      case "CONFIRMED":
        return {
          telemetryLabel: "KITCHEN TELEMETRY // ORDER CONFIRMED",
          headline: "Kitchen Confirmed",
          message: "The kitchen has verified your order and queued preparation.",
          badgeColor: "text-[#E5C378] border-[#B68A2D]/50 bg-[#25221B]",
          glowColor: "rgba(182, 138, 45, 0.35)",
          accentHex: "#B68A2D",
          indicatorType: "confirmed",
          stepIndex: 1,
        };
      case "SENT_TO_KITCHEN":
      case "PREPARING":
        return {
          telemetryLabel: "KITCHEN TELEMETRY // PREPARING",
          headline: "Preparing Your Order",
          message: "The culinary team is actively crafting your items.",
          badgeColor: "text-cyan-400 border-cyan-500/40 bg-cyan-950/30",
          glowColor: "rgba(34, 211, 238, 0.3)",
          accentHex: "#22D3EE",
          indicatorType: "preparing",
          stepIndex: 2,
        };
      case "READY":
        return {
          telemetryLabel: "EXPEDITION // READY AT PASS",
          headline: "Ready for Pass",
          message: "Your order is plated and ready for table service / collection.",
          badgeColor: "text-amber-300 border-amber-400/60 bg-amber-900/40 animate-pulse",
          glowColor: "rgba(251, 191, 36, 0.5)",
          accentHex: "#F5C869",
          indicatorType: "ready",
          stepIndex: 3,
        };
      case "COMPLETED":
        return {
          telemetryLabel: "TELEMETRY // ORDER FULFILLED",
          headline: "Order Completed",
          message: "Your order has been served. Enjoy your dining experience.",
          badgeColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/40",
          glowColor: "rgba(16, 185, 129, 0.35)",
          accentHex: "#10B981",
          indicatorType: "completed",
          stepIndex: 4,
        };
      case "CANCELLED":
        return {
          telemetryLabel: "TELEMETRY // ORDER CANCELLED",
          headline: "Order Cancelled",
          message: "This order was cancelled. Please speak with your server for details.",
          badgeColor: "text-rose-400 border-rose-500/40 bg-rose-950/40",
          glowColor: "rgba(244, 63, 94, 0.3)",
          accentHex: "#F43F5E",
          indicatorType: "cancelled",
          stepIndex: -1,
        };
      default:
        return {
          telemetryLabel: "KITCHEN TELEMETRY // IN QUEUE",
          headline: "Processing Order",
          message: "Synchronizing status with the kitchen orchestrator.",
          badgeColor: "text-[#E5C378] border-[#B68A2D]/40 bg-[#1C1A15]",
          glowColor: "rgba(182, 138, 45, 0.2)",
          accentHex: "#B68A2D",
          indicatorType: "sync",
          stepIndex: 1,
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  // Milestone stages (never advances ahead of backend order status)
  const STAGES = [
    { label: "TRANSMITTED", desc: "Order Logged" },
    { label: "CONFIRMED", desc: "Station Queued" },
    { label: "PREPARING", desc: "Chef Active" },
    { label: "READY", desc: "Pass Expedited" },
    { label: "COMPLETED", desc: "Table Served" },
  ];

  // Radial dial ticks (48 ticks around 360 degrees)
  const dialTicks = Array.from({ length: 48 }).map((_, i) => {
    const angle = (i * 360) / 48;
    const isMajor = i % 4 === 0;
    return { angle, isMajor };
  });

  const handleCopyOrderId = () => {
    if (order.id) {
      navigator.clipboard.writeText(order.id);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl bg-[#11100D]/95 border border-[#B68A2D]/35 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden font-sans text-[#F3EFE6] tactical-grid select-none">
      {/* Top Ambient HUD Vignette */}
      <div className="absolute inset-0 tactical-vignette pointer-events-none" />

      {/* Decorative Corner Brackets */}
      <div className="corner-bracket-tl !w-5 !h-5 !border-[#B68A2D]/80" />
      <div className="corner-bracket-tr !w-5 !h-5 !border-[#B68A2D]/80" />
      <div className="corner-bracket-bl !w-5 !h-5 !border-[#B68A2D]/80" />
      <div className="corner-bracket-br !w-5 !h-5 !border-[#B68A2D]/80" />

      {/* 1. TOP TELEMETRY HEADER */}
      <div className="relative z-10 px-5 sm:px-8 py-4 border-b border-[#B68A2D]/20 bg-[#191814]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Left: Venue Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B68A2D] to-[#E5C378] flex items-center justify-center text-[#11100D] font-black shadow-[0_0_15px_rgba(182,138,45,0.4)]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-widest text-white text-sm">
                AIVORA TELEMETRY
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                LIVE LINK
              </span>
            </div>
            <p className="text-[10px] text-[#B68A2D]/80 tracking-wider uppercase">
              {order.restaurant?.name || "Venue Orchestrator"} • REF #{order.orderNumber || order.id.slice(0, 6).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Right: Technical Readouts & Actions */}
        <div className="flex items-center gap-4 text-[11px] text-[#B68A2D]/80">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-neutral-500">ZULU:</span>
            <span className="text-cyan-400 font-bold tracking-wider">{zuluTime || "12:00:00Z"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-neutral-300 font-bold">{latencyMs}ms</span>
          </div>

          <button
            type="button"
            onClick={() => void syncOrder()}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-[#25221B] hover:bg-[#302B21] border border-[#B68A2D]/30 text-[#E5C378] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Force refresh order telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs transition cursor-pointer"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {/* 2. CENTRAL ANIMATED FUI RADAR STATUS INDICATOR */}
      <div className="relative z-10 px-4 sm:px-8 py-8 sm:py-12 flex flex-col items-center justify-center text-center">
        {/* Subtle Background Radial Ambient Glow */}
        <div
          className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full pointer-events-none blur-3xl transition-all duration-1000"
          style={{ backgroundColor: statusConfig.glowColor }}
        />

        {/* Central HUD Dial Core */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
          {/* SVG Sci-Fi HUD Ring Network */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Radial Ticks */}
            <g transform="translate(200, 200)" opacity="0.45">
              {dialTicks.map(({ angle, isMajor }, idx) => (
                <line
                  key={idx}
                  x1="0"
                  y1={isMajor ? -188 : -184}
                  x2="0"
                  y2="-176"
                  stroke={isMajor ? "#B68A2D" : "rgba(182, 138, 45, 0.4)"}
                  strokeWidth={isMajor ? "1.7" : "1"}
                  transform={`rotate(${angle})`}
                />
              ))}
            </g>

            {/* Static Outer Track Ring */}
            <circle
              cx="200"
              cy="200"
              r="174"
              stroke="#B68A2D"
              strokeWidth="1.2"
              strokeDasharray="4 6"
              strokeOpacity="0.35"
            />

            {/* Concentric Rotating Dash Track (Anime-inspired) */}
            <circle
              cx="200"
              cy="200"
              r="152"
              stroke="#B68A2D"
              strokeWidth="1.5"
              strokeDasharray="24 16 72 16"
              strokeOpacity="0.5"
              className="animate-spin-slow origin-center"
            />

            {/* Inner Counter-Rotating Reticle Track */}
            <circle
              cx="200"
              cy="200"
              r="128"
              stroke="#B68A2D"
              strokeWidth="1"
              strokeDasharray="8 8"
              strokeOpacity="0.3"
              className="animate-spin-reverse-slow origin-center"
            />

            {/* Animated Progress Arc (Advances only with verified backend status) */}
            <circle
              ref={progressRingRef}
              cx="200"
              cy="200"
              r="140"
              stroke={statusConfig.accentHex}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="440"
              strokeDashoffset="440"
              transform="rotate(-90 200 200)"
              className="drop-shadow-[0_0_12px_currentColor] transition-colors duration-700"
            />

            {/* Scanning Radar Ring (Active during PREPARING / SENT_TO_KITCHEN) */}
            <g
              ref={radarSweepRef}
              transform="translate(200, 200)"
              className="origin-center"
              opacity={order.status === "PREPARING" || order.status === "SENT_TO_KITCHEN" ? "1" : "0"}
            >
              <defs>
                <linearGradient id="radarBeam" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#22D3EE" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 0 L 140 0 A 140 140 0 0 0 98.9 -98.9 Z"
                fill="url(#radarBeam)"
              />
              <line
                x1="0"
                y1="0"
                x2="140"
                y2="0"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_#22D3EE]"
              />
            </g>

            {/* High-visibility Pulsing Beacon (Active during READY) */}
            <circle
              ref={beaconPulseRef}
              cx="200"
              cy="200"
              r="100"
              stroke="#F5C869"
              strokeWidth="2.5"
              fill="rgba(245, 200, 105, 0.08)"
              className="origin-center"
              opacity={order.status === "READY" ? "1" : "0"}
            />

            {/* Revolving Orbital Telemetry Satellites */}
            <g transform="translate(200, 200)" className="animate-spin-slow origin-center">
              <circle
                ref={orbitalNode1Ref}
                cx="152"
                cy="0"
                r="4"
                fill={order.status === "COMPLETED" ? "#10B981" : "#22D3EE"}
                className="drop-shadow-[0_0_10px_currentColor]"
              />
              <circle
                ref={orbitalNode2Ref}
                cx="-128"
                cy="0"
                r="3.5"
                fill="#B68A2D"
                className="drop-shadow-[0_0_8px_#B68A2D]"
              />
            </g>

            {/* Center Core HUD Boundary */}
            <circle
              cx="200"
              cy="200"
              r="90"
              stroke="#B68A2D"
              strokeWidth="1.2"
              fill="#14120E"
              fillOpacity="0.95"
              strokeOpacity="0.4"
            />
          </svg>

          {/* Central Status Core Information */}
          <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center max-w-[190px]">
            {/* Status Icon */}
            <div className="mb-2">
              {order.status === "PREPARING" || order.status === "SENT_TO_KITCHEN" ? (
                <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
              ) : order.status === "READY" ? (
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 drop-shadow-[0_0_12px_rgba(245,200,105,0.7)] animate-bounce">
                  <ChefHat className="w-5 h-5" />
                </div>
              ) : order.status === "COMPLETED" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : order.status === "CANCELLED" ? (
                <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#B68A2D]/15 border border-[#B68A2D]/40 flex items-center justify-center text-[#E5C378]">
                  <Compass className="w-5 h-5 animate-spin-slow" />
                </div>
              )}
            </div>

            {/* Verified Backend Status Code */}
            <span
              className={`font-mono text-[10px] tracking-widest uppercase font-extrabold px-2 py-0.5 rounded-full border mb-1.5 ${statusConfig.badgeColor}`}
            >
              {order.status}
            </span>

            {/* Clear Primary Customer Headline */}
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
              {statusConfig.headline}
            </h2>

            {/* Tactical Channel Badge */}
            <span className="font-mono text-[9px] text-neutral-400 tracking-wider uppercase mt-1">
              CH // {order.orderChannel || "TABLE_SERVICE"}
            </span>
          </div>
        </div>

        {/* Clear Primary Message (Prominent Customer Facing) */}
        <div className="mt-6 max-w-md space-y-1">
          {/* Secondary Monospaced Telemetry Tag */}
          <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#B68A2D] uppercase">
            {statusConfig.telemetryLabel}
          </p>
          {/* Plain, readable customer message */}
          <p className="text-sm sm:text-base text-neutral-200 font-medium leading-relaxed">
            {statusConfig.message}
          </p>
        </div>
      </div>

      {/* 3. VERIFIED TELEMETRY MILESTONE PIPELINE (FUI Stepper) */}
      <div className="relative z-10 px-5 sm:px-8 py-5 border-t border-b border-[#B68A2D]/20 bg-[#161410]/80">
        <div className="flex items-center justify-between mb-3 text-[10px] font-mono tracking-widest text-[#B68A2D] uppercase">
          <span>PROGRESS MILESTONES</span>
          <span>ORCHESTRATOR STATUS: CONFIRMED_SYNC</span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {STAGES.map((stg, i) => {
            const isPassed = statusConfig.stepIndex >= i && order.status !== "CANCELLED";
            const isCurrent = statusConfig.stepIndex === i && order.status !== "CANCELLED";

            return (
              <div
                key={stg.label}
                className={`relative p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? "bg-[#25221B] border-[#E5C378] shadow-[0_0_15px_rgba(182,138,45,0.3)]"
                    : isPassed
                    ? "bg-[#1A1813] border-emerald-500/40 text-emerald-400"
                    : "bg-[#14120E] border-neutral-800 text-neutral-600"
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrent
                        ? "bg-[#E5C378] animate-ping"
                        : isPassed
                        ? "bg-emerald-400"
                        : "bg-neutral-700"
                    }`}
                  />
                </div>
                <p
                  className={`font-mono text-[10px] font-bold tracking-wider uppercase truncate ${
                    isCurrent
                      ? "text-[#E5C378]"
                      : isPassed
                      ? "text-neutral-200"
                      : "text-neutral-500"
                  }`}
                >
                  {stg.label}
                </p>
                <p className="text-[9px] text-neutral-400 hidden sm:block truncate mt-0.5">
                  {stg.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ORDER TELEMETRY GRID: ORDER SUMMARY & KITCHEN READOUTS */}
      <div className="relative z-10 p-5 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left: Authoritative Items Manifest */}
        <div className="rounded-2xl border border-[#B68A2D]/30 bg-[#181612]/90 p-5 space-y-4 shadow-lg corner-bracket-container">
          <div className="corner-bracket-tl !w-3.5 !h-3.5" />
          <div className="corner-bracket-tr !w-3.5 !h-3.5" />

          <div className="flex items-center justify-between border-b border-[#B68A2D]/20 pb-2.5">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-[#E5C378]" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Order Manifest ({order.items.length} items)
              </h3>
            </div>
            <span className="font-mono text-[10px] text-neutral-400">
              #{order.orderNumber || order.id.slice(0, 8)}
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {order.items.map((it, idx) => (
              <div
                key={it.id || idx}
                className="p-2.5 rounded-xl bg-[#211F1A]/80 border border-neutral-800 flex justify-between items-start gap-2"
              >
                <div>
                  <div className="font-bold text-[#F3EFE6] text-xs">
                    <span className="text-[#E5C378] font-mono mr-1.5">{it.quantity}x</span>
                    {it.menuItem?.name || "Menu Item"}
                  </div>
                  {it.modifiers && it.modifiers.length > 0 && (
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5 space-x-1">
                      {it.modifiers.map((m, mIdx) => (
                        <span key={m.id || mIdx} className="inline-block bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-300">
                          +{m.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {it.notes && (
                    <p className="text-[10px] text-amber-400/80 italic mt-0.5 font-mono">
                      Note: {it.notes}
                    </p>
                  )}
                </div>
                <span className="font-mono font-bold text-white whitespace-nowrap">
                  {currencySymbol}
                  {Number(it.subtotal || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          <div className="pt-3 border-t border-[#B68A2D]/20 space-y-1.5 font-mono text-[11px]">
            {order.subtotal !== undefined && (
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{currencySymbol}{Number(order.subtotal || 0).toFixed(2)}</span>
              </div>
            )}
            {order.tax !== undefined && (
              <div className="flex justify-between text-neutral-400">
                <span>Tax</span>
                <span>{currencySymbol}{Number(order.tax || 0).toFixed(2)}</span>
              </div>
            )}
            {order.tip !== undefined && Number(order.tip) > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Tip</span>
                <span>+{currencySymbol}{Number(order.tip).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-neutral-800">
              <span className="text-[#E5C378]">Total Amount</span>
              <span className="text-[#E5C378] text-base">
                {currencySymbol}{Number(order.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Technical Station & Pacing Telemetry */}
        <div className="rounded-2xl border border-[#B68A2D]/30 bg-[#181612]/90 p-5 space-y-4 shadow-lg corner-bracket-container flex flex-col justify-between">
          <div className="corner-bracket-tl !w-3.5 !h-3.5" />
          <div className="corner-bracket-tr !w-3.5 !h-3.5" />

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#B68A2D]/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Kitchen Telemetry & Dispatch
                </h3>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ORCHESTRATOR LIVE
              </span>
            </div>

            {/* Technical Parameters */}
            <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-[#211F1A]/80 border border-neutral-800 space-y-1">
                <span className="text-[9px] text-[#B68A2D] uppercase block">Location Terminal</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#E5C378]" />
                  {order.location ? order.location.name : "Dining Location"}
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  CODE: {order.location?.code || "T-01"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#211F1A]/80 border border-neutral-800 space-y-1">
                <span className="text-[9px] text-[#B68A2D] uppercase block">Fulfillment</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {order.fulfillmentMethod || "TABLE_SERVICE"}
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  DISPATCH // AUTHORITATIVE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#211F1A]/80 border border-neutral-800 space-y-1">
                <span className="text-[9px] text-[#B68A2D] uppercase block">Pacing Sequence</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  COURSE SYNCHRONIZED
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  STATION // HOT_LINE_ALPHA
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#211F1A]/80 border border-neutral-800 space-y-1">
                <span className="text-[9px] text-[#B68A2D] uppercase block">Telemetry Pings</span>
                <span className="font-bold text-cyan-400">
                  {syncCount} CYCLES
                </span>
                <span className="text-[9px] text-neutral-500 block">
                  LATENCY // {latencyMs}MS
                </span>
              </div>
            </div>

            {/* Special Instructions Readout if present */}
            {order.specialInstructions && (
              <div className="p-3 rounded-xl bg-[#25221B]/90 border border-[#B68A2D]/30 space-y-1">
                <span className="text-[9px] font-mono text-[#E5C378] uppercase font-bold tracking-wider block">
                  Guest Special Instructions
                </span>
                <p className="text-xs text-neutral-300 italic font-mono">
                  &ldquo;{order.specialInstructions}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons: Order Additional Items & Digital Tax Receipt */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {/* Primary Action: Order More Drinks & Food */}
            <button
              type="button"
              onClick={onOrderMore || onClose}
              className="flex-1 py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer uppercase bg-gradient-to-r from-[#B68A2D] via-[#E5C378] to-[#B68A2D] text-[#11100D] hover:opacity-95 shadow-[0_0_20px_rgba(182,138,45,0.4)] hover:scale-[1.01] active:scale-[0.99]"
            >
              <PlusCircle className="w-4 h-4 text-[#11100D]" />
              <span>+ ORDER MORE ITEMS // DRINKS & SIDES</span>
            </button>

            {/* Secondary Action: Digital Itemized Receipt */}
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer uppercase bg-[#211F1A] border border-[#B68A2D]/40 text-[#E5C378] hover:border-[#B68A2D] hover:bg-[#2A261E] hover:text-white"
            >
              <Receipt className="w-4 h-4 text-[#E5C378]" />
              <span>DIGITAL RECEIPT</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM TELEMETRY FOOTER */}
      <div className="relative z-10 px-5 sm:px-8 py-3 bg-[#0E0D0B] border-t border-[#B68A2D]/20 flex flex-wrap items-center justify-between text-[10px] font-mono text-[#B68A2D]/60 gap-2">
        <div className="flex items-center gap-3">
          <span>AIVORA PRIVATE DINING INTELLIGENCE PLATFORM</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">DISPATCH NODE // T-FUI-77</span>
        </div>
        <div>
          <span>LAST SYNC: {lastSyncTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 6. DIGITAL RECEIPT & TAX INVOICE MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#161512] border border-[#B68A2D]/50 shadow-[0_0_50px_rgba(182,138,45,0.3)] p-6 font-mono text-[#F3EFE6] space-y-4">
            <div className="corner-bracket-tl !w-4 !h-4 !border-[#B68A2D]/80" />
            <div className="corner-bracket-tr !w-4 !h-4 !border-[#B68A2D]/80" />
            <div className="corner-bracket-bl !w-4 !h-4 !border-[#B68A2D]/80" />
            <div className="corner-bracket-br !w-4 !h-4 !border-[#B68A2D]/80" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#B68A2D]/30 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#E5C378]" />
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                    AIVORA DIGITAL RECEIPT
                  </h3>
                  <span className="text-[10px] text-[#B68A2D] tracking-widest block">
                    TAX INVOICE // AUTHORITATIVE DISPATCH
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-lg bg-[#211F1A] border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:border-[#B68A2D] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Meta Readout */}
            <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-[#0E0D0B] border border-neutral-800">
              <div>
                <span className="text-[9px] text-[#B68A2D]/70 uppercase block">ORDER REF</span>
                <span className="font-bold text-white flex items-center gap-1">
                  #{order.id.slice(0, 12)}
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    title="Copy Order ID"
                    className="text-[#E5C378] hover:text-white cursor-pointer ml-1"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div>
                <span className="text-[9px] text-[#B68A2D]/70 uppercase block">TERMINAL / TABLE</span>
                <span className="font-bold text-white">{order.location?.name || "VIP Dining"}</span>
              </div>
              <div>
                <span className="text-[9px] text-[#B68A2D]/70 uppercase block">ZULU TIMESTAMP</span>
                <span className="text-neutral-300">{new Date(order.createdAt).toISOString().replace("T", " ").slice(0, 19)}Z</span>
              </div>
              <div>
                <span className="text-[9px] text-[#B68A2D]/70 uppercase block">FULFILLMENT</span>
                <span className="text-cyan-400 font-bold">{order.fulfillmentMethod || "TABLE_SERVICE"}</span>
              </div>
            </div>

            {/* Itemized Lines */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border-t border-b border-neutral-800 py-3 text-xs">
              {order.items?.map((it, idx) => {
                const title = it.menuItem?.name || "Culinary Selection";
                const qty = it.quantity || 1;
                const unitPrice = Number(it.unitPrice || 0);
                const subtotal = Number(it.subtotal || unitPrice * qty);
                return (
                  <div key={it.id || idx} className="flex justify-between items-center text-neutral-300">
                    <div className="flex items-center gap-2">
                      <span className="text-[#E5C378] font-bold">{qty}×</span>
                      <span>{title}</span>
                    </div>
                    <span className="text-white font-bold">
                      {currencySymbol}{subtotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{currencySymbol}{Number(order.subtotal || order.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Tax (GST / VAT)</span>
                <span>{currencySymbol}{Number(order.tax || 0).toFixed(2)}</span>
              </div>
              {order.tip !== undefined && Number(order.tip) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Service Gratuity</span>
                  <span>+{currencySymbol}{Number(order.tip).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#E5C378] pt-2 border-t border-neutral-800">
                <span>Total Charge</span>
                <span className="text-base">{currencySymbol}{Number(order.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Security Checksum & Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 text-[10px] text-neutral-500">
              <span className="truncate">VERIFICATION RETICLE // HASH: {order.id.slice(0, 16).toUpperCase()}</span>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-3 py-1.5 rounded-lg bg-[#211F1A] border border-[#B68A2D]/50 text-[#E5C378] hover:text-white hover:bg-[#2A261E] flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT / SAVE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
