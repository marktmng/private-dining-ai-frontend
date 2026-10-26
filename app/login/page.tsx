"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import {
  Sparkles,
  Shield,
  KeyRound,
  Mail,
  ArrowRight,
  AlertCircle,
  Building,
  ChefHat,
  Compass,
  Hotel,
  Coffee,
  Store,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result.token) {
        localStorage.setItem("aivora_auth_token", result.token);
      }
      router.push("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid email or password.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (
    type: "demo_a" | "saas_owner" | "hotel" | "cafe" | "kiosk"
  ) => {
    switch (type) {
      case "demo_a":
        setEmail("restaurant-a@example.com");
        break;
      case "saas_owner":
        setEmail("owner@testvenue.com");
        break;
      case "hotel":
        setEmail("hotel-demo@example.com");
        break;
      case "cafe":
        setEmail("cafe-demo@example.com");
        break;
      case "kiosk":
        setEmail("kiosk-demo@example.com");
        break;
    }
    setPassword("TestPassword123!");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0D0C0A] text-[#F3EFE6] flex flex-col font-sans selection:bg-[#B68A2D]/30 selection:text-[#E5C378]">
      {/* Top Navbar */}
      <header className="border-b border-[#B68A2D]/20 bg-[#14120E]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#B68A2D] to-[#E5C378] flex items-center justify-center text-[#12110D] font-bold shadow-lg shadow-[#B68A2D]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-sm tracking-widest text-[#E5C378] font-bold">AIVORA</span>
            <span className="text-xs text-neutral-400 block font-sans">Hospitality SaaS Platform</span>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-neutral-400 hidden sm:inline">New hospitality business?</span>
          <Link
            href="/register"
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold hover:opacity-95 transition"
          >
            Register Venue
          </Link>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[#B68A2D]/10 border border-[#B68A2D]/30 text-[#E5C378]">
              <Shield className="w-3.5 h-3.5 text-[#B68A2D]" />
              Staff & Management Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Sign In to Your Venue
            </h1>
            <p className="text-sm text-neutral-400">
              Access menus, orders, real-time KDS dispatch, and analytics.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-mono flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Box */}
          <div className="bg-[#14120E] border border-[#B68A2D]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#B68A2D]" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. restaurant-a@example.com"
                  className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#B68A2D]" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-[#B68A2D]/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer pt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#12110D]/30 border-t-[#12110D] rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-fills (Development Only) */}
            {process.env.NODE_ENV !== "production" && (
              <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block">
                  Quick Demo Accounts (Dev Only):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill("demo_a")}
                    className="px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-[11px] font-mono flex items-center gap-1.5 transition"
                  >
                    <Building className="w-3 h-3 text-[#B68A2D]" />
                    <span>Restaurant A</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("saas_owner")}
                    className="px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-[11px] font-mono flex items-center gap-1.5 transition"
                  >
                    <Compass className="w-3 h-3 text-[#B68A2D]" />
                    <span>Grand Pavilion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("hotel")}
                    className="px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-[11px] font-mono flex items-center gap-1.5 transition"
                  >
                    <Hotel className="w-3 h-3 text-[#B68A2D]" />
                    <span>Luminary Hotel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("cafe")}
                    className="px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-[11px] font-mono flex items-center gap-1.5 transition"
                  >
                    <Coffee className="w-3 h-3 text-[#B68A2D]" />
                    <span>Velvet Cafe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("kiosk")}
                    className="px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-[11px] font-mono flex items-center gap-1.5 transition"
                  >
                    <Store className="w-3 h-3 text-[#B68A2D]" />
                    <span>Glace Kiosk</span>
                  </button>
                </div>
              </div>
            )}

            {/* Link to Register */}
            <div className="pt-2 text-center">
              <p className="text-xs text-neutral-400">
                Don't have a registered venue yet?{" "}
                <Link href="/register" className="text-[#E5C378] hover:underline font-bold">
                  Register in 60s →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#B68A2D]/10 py-6 text-center text-xs text-neutral-500 font-mono">
        <p>AIVORA Autonomous Hospitality Systems • Multi-Tenant Enterprise SaaS</p>
      </footer>
    </div>
  );
}
