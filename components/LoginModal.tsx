"use client";

import { useState } from "react";
import { login } from "@/lib/api";
import type { AuthUser } from "@/types/order";
import { Sparkles, Shield, X, KeyRound, Mail } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: AuthUser) => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("restaurant-a@example.com");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);
      onSuccess(result.token, result.data);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sign in. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickFill() {
    setEmail("restaurant-a@example.com");
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="corner-bracket-container relative w-full max-w-md rounded-2xl bg-[#1C1A15] border border-[#B68A2D]/40 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-[#F3EFE6]">
        {/* Corner Brackets */}
        <div className="corner-bracket-tl !w-4 !h-4" />
        <div className="corner-bracket-tr !w-4 !h-4" />
        <div className="corner-bracket-bl !w-4 !h-4" />
        <div className="corner-bracket-br !w-4 !h-4" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#B68A2D]/25">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#25221B] border border-[#B68A2D] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#B68A2D]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold tracking-widest text-[#F3EFE6] uppercase">
                Restaurant Authentication
              </h3>
              <p className="font-mono text-[10px] text-[#B68A2D]/80">
                SaaS Live Database & Kitchen Dispatch Sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#B68A2D]/60 hover:text-white p-1 rounded hover:bg-[#25221B] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 font-mono">
          <div>
            <label className="block text-xs font-bold text-[#E5C378] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#B68A2D]" />
              <span>Restaurant Staff Email</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. restaurant-a@example.com"
              className="w-full rounded-xl bg-[#191814] border border-[#B68A2D]/30 focus:border-[#B68A2D] px-3.5 py-2.5 text-xs text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#E5C378] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#B68A2D]" />
              <span>Staff Security Key</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#191814] border border-[#B68A2D]/30 focus:border-[#B68A2D] px-3.5 py-2.5 text-xs text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] text-[#B68A2D] hover:text-[#E5C378] underline cursor-pointer"
            >
              Fill Restaurant A Demo Credentials
            </button>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#211F1A] hover:bg-[#28251E] border border-[#B68A2D]/30 py-2.5 font-bold text-xs text-[#F3EFE6]/80 transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] hover:opacity-95 text-[#191814] font-bold text-xs py-2.5 transition-all shadow-[0_0_15px_rgba(182,138,45,0.4)] disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#191814]/30 border-t-[#191814] rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
