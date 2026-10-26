"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, Radio, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import type { PersistedOrder } from "@/types/order";
import { getGuestOrder, trackOrderPublic } from "@/lib/api";
import TacticalOrderTracker from "@/components/TacticalOrderTracker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrackOrderPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const orderId = resolvedParams.id;
  const sessionToken = searchParams.get("sessionToken") || undefined;

  const [order, setOrder] = useState<PersistedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let fetched: PersistedOrder;
      if (sessionToken) {
        fetched = await getGuestOrder(orderId, sessionToken);
      } else {
        fetched = await trackOrderPublic(orderId);
      }
      setOrder(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to retrieve order telemetry.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      void fetchOrder();
    }
  }, [orderId, sessionToken]);

  return (
    <div className="min-h-screen bg-[#0D0C0A] text-[#F3EFE6] tactical-grid flex flex-col font-sans selection:bg-[#B68A2D]/30 selection:text-[#E5C378]">
      {/* Top Ambient HUD Vignette */}
      <div className="fixed inset-0 tactical-vignette pointer-events-none" />

      {/* Header Navigation */}
      <header className="relative z-20 border-b border-[#B68A2D]/20 bg-[#14120E]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B68A2D] to-[#E5C378] flex items-center justify-center text-[#11100D] font-black shadow-lg shadow-[#B68A2D]/20 group-hover:scale-105 transition-transform">
            <Radio className="w-4 h-4 text-[#11100D]" />
          </div>
          <div>
            <span className="font-mono text-sm tracking-widest text-[#E5C378] font-bold">
              AIVORA
            </span>
            <span className="text-[10px] text-neutral-400 block font-mono">
              ORDER TELEMETRY HUD
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#B68A2D]/10 border border-[#B68A2D]/30 text-[#E5C378] uppercase">
            REF #{orderId.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {isLoading && (
          <div className="p-8 rounded-3xl bg-[#14120E]/90 border border-[#B68A2D]/30 text-center space-y-4 max-w-sm corner-bracket-container">
            <div className="corner-bracket-tl !w-4 !h-4" />
            <div className="corner-bracket-tr !w-4 !h-4" />
            <div className="corner-bracket-bl !w-4 !h-4" />
            <div className="corner-bracket-br !w-4 !h-4" />

            <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#B68A2D] border-t-transparent animate-spin flex items-center justify-center">
              <Radio className="w-6 h-6 text-[#E5C378] animate-pulse" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold tracking-widest text-[#E5C378] uppercase">
                SYNCHRONIZING TELEMETRY...
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Connecting to kitchen dispatch network...
              </p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-8 rounded-3xl bg-[#1C1210]/90 border border-rose-500/40 text-center space-y-4 max-w-md corner-bracket-container shadow-2xl">
            <div className="corner-bracket-tl !w-4 !h-4 !border-rose-500" />
            <div className="corner-bracket-tr !w-4 !h-4 !border-rose-500" />
            <div className="corner-bracket-bl !w-4 !h-4 !border-rose-500" />
            <div className="corner-bracket-br !w-4 !h-4 !border-rose-500" />

            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <p className="font-mono text-xs font-bold tracking-widest text-rose-400 uppercase">
                TELEMETRY LINK FAILED
              </p>
              <p className="text-xs text-neutral-300 mt-1">{error}</p>
            </div>

            <button
              onClick={() => void fetchOrder()}
              className="px-6 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RETRY LINK</span>
            </button>
          </div>
        )}

        {order && !isLoading && (
          <TacticalOrderTracker
            initialOrder={order}
            sessionToken={sessionToken}
            currencySymbol={order.restaurant?.currency === "EUR" ? "€" : "$"}
          />
        )}
      </main>
    </div>
  );
}
