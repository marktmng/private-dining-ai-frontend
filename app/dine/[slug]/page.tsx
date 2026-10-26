"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getPublicRestaurant } from "@/lib/api";
import type { PublicRestaurantInfo } from "@/types/order";
import { Utensils, QrCode, ArrowRight, AlertCircle } from "lucide-react";

export default function GeneralDinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  const [restaurant, setRestaurant] = useState<PublicRestaurantInfo | null>(null);
  const [locationCode, setLocationCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicRestaurant(slug)
      .then((data) => {
        setRestaurant(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Venue not found";
        setError(msg);
        setIsLoading(false);
      });
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">Venue Not Found</h2>
        <p className="text-neutral-400 text-sm mt-1">{error || "Could not load venue."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-extrabold text-2xl text-white mx-auto shadow-lg shadow-amber-900/30">
          {restaurant.name.charAt(0)}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <span className="inline-block mt-1 text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full bg-neutral-800 text-amber-400 border border-neutral-700">
            {restaurant.businessType.replace(/_/g, " ")}
          </span>
          {restaurant.description && (
            <p className="text-xs text-neutral-400 mt-2">{restaurant.description}</p>
          )}
        </div>

        <div className="space-y-3 pt-2 text-left">
          <label className="text-xs font-semibold text-neutral-300">
            Enter Table, Room, or Pickup Code:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
              placeholder="e.g. TABLE-12, ROOM-204"
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white uppercase placeholder:normal-case placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
            <Link
              href={locationCode.trim() ? `/dine/${slug}/${encodeURIComponent(locationCode.trim())}` : "#"}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                locationCode.trim()
                  ? "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                  : "bg-neutral-800 text-neutral-500 pointer-events-none"
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-[11px] text-neutral-500 text-center">
            Or scan the QR code located on your table, room tablet, or kiosk.
          </p>
        </div>
      </div>
    </div>
  );
}
