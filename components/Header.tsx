"use client";

import type { AuthUser } from "@/types/order";

interface Props {
  user?: AuthUser | null;
  restaurantName?: string;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
}

export default function Header({
  user,
  restaurantName,
  onSignOut,
  onOpenLogin,
}: Props) {
  const isAuthenticated = !!user;

  return (
    <header className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <span className="font-bold text-lg tracking-tight text-white">
            AIVORA <span className="text-blue-400 font-medium text-sm">Private Dining AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 bg-slate-900 border border-emerald-500/30 rounded-full px-4 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs text-left">
                <p className="font-semibold text-emerald-300">
                  {restaurantName || "Restaurant A"}
                </p>
                <p className="text-slate-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="ml-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full px-2.5 py-1 transition-colors"
                title="Switch to unauthenticated prototype"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-200 font-medium">
                Prototype Mode
              </span>
              <button
                type="button"
                onClick={onOpenLogin}
                className="ml-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-full px-3 py-1 transition-colors shadow-sm"
              >
                Sign In (Restaurant A)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center pt-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          {isAuthenticated ? `${restaurantName || "Restaurant A"} Private Dining` : "Private Dining AI"}
        </h1>
        <p className="text-slate-400 text-lg mt-2">
          {isAuthenticated
            ? "Voice ordering connected to live Supabase database menu."
            : "Welcome. Tap the microphone to begin your order."}
        </p>
      </div>
    </header>
  );
}