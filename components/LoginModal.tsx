"use client";

import { useState } from "react";
import { login } from "@/lib/api";
import type { AuthUser } from "@/types/order";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold">Restaurant Sign In</h3>
            <p className="text-sm text-slate-400">Authenticate for SaaS live database menus</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Restaurant Staff Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. restaurant-a@example.com"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Fill Restaurant A Demo
            </button>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-2.5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 font-medium transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
