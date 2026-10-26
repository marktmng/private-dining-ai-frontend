"use client";

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  UtensilsCrossed,
  Building,
  Coffee,
  Truck,
  Monitor,
  ShoppingBag,
  Mic,
  ChefHat,
  BarChart3,
  QrCode,
  ShieldCheck,
  CreditCard,
  Users,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function LandingHomePage() {
  return (
    <div className="min-h-screen bg-[#0D0C0A] text-[#F3EFE6] flex flex-col font-sans selection:bg-[#B68A2D]/30 selection:text-[#E5C378]">
      {/* Top Navigation */}
      <header className="border-b border-[#B68A2D]/20 bg-[#14120E]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B68A2D] to-[#E5C378] flex items-center justify-center text-[#12110D] font-bold shadow-lg shadow-[#B68A2D]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-base tracking-widest text-[#E5C378] font-bold">AIVORA</span>
            <span className="text-[11px] text-neutral-400 block font-sans">Hospitality SaaS Platform</span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
          <Link
            href="/kitchen"
            className="hidden md:flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
          >
            <ChefHat className="w-3.5 h-3.5 text-[#B68A2D]" />
            <span>Kitchen Display</span>
          </Link>
          <Link
            href="/admin"
            className="hidden md:flex items-center gap-1.5 text-neutral-400 hover:text-white transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#B68A2D]" />
            <span>Admin Center</span>
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl border border-[#B68A2D]/40 text-[#E5C378] hover:bg-[#B68A2D]/10 hover:border-[#B68A2D] transition-colors font-bold"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold shadow-md shadow-[#B68A2D]/30 hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <span>Register Business</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-6 border-b border-[#B68A2D]/15 bg-gradient-to-b from-[#14120E] via-[#0D0C0A] to-[#0D0C0A]">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#B68A2D]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-[#B68A2D]/10 border border-[#B68A2D]/30 text-[#E5C378]">
            <ShieldCheck className="w-4 h-4 text-[#B68A2D]" />
            All-in-One Multi-Tenant Hospitality Ordering SaaS
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            One Platform for Every <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B68A2D] via-[#E5C378] to-amber-200">
              Hospitality & Food Business
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            From high-end restaurants and hotel room service to beachside kiosks, ice cream parlors, and food trucks.
            Configure menus, ordering channels, real-time kitchen displays, and AI voice ordering seamlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold text-sm uppercase tracking-wider shadow-xl shadow-[#B68A2D]/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Register Your Venue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-[#B68A2D]/60 text-neutral-200 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In to Dashboard</span>
            </Link>
          </div>

          {/* Business types ticker */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-neutral-400">
            <span className="text-neutral-500">Supports:</span>
            {["Restaurants", "Hotels", "Cafes", "Ice Cream Shops", "Beach Kiosks", "Food Trucks", "Takeaways"].map(
              (type) => (
                <span
                  key={type}
                  className="px-2.5 py-1 rounded-lg bg-[#191814] border border-neutral-800 text-neutral-300"
                >
                  {type}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Live Interactive Demos Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#E5C378] font-bold">
            Interactive Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore AIVORA's Live Modules
          </h2>
          <p className="text-sm text-neutral-400 max-w-lg mx-auto">
            Test the entire guest and kitchen lifecycle directly inside your browser right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Module 1: Mobile Dine-In */}
          <Link
            href="/dine/test-venue-saas/PATIO-1234"
            className="group p-6 rounded-2xl bg-[#14120E] border border-neutral-800 hover:border-[#B68A2D]/60 transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-[#B68A2D]/10"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#E5C378] flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white group-hover:text-[#E5C378] transition-colors">
                  Mobile QR Dine-In
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Guest table, patio, or hotel room ordering with modifier customizers, bill splitting & live tracking.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-xs font-mono text-[#E5C378] font-bold">
              <span>Launch Guest View</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 2: Touchscreen Kiosk */}
          <Link
            href="/kiosk/test-venue-saas/KIOSK-01"
            className="group p-6 rounded-2xl bg-[#14120E] border border-neutral-800 hover:border-[#B68A2D]/60 transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-[#B68A2D]/10"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">
                  Touchscreen Kiosk
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Self-service interface designed for ice cream bars and beach kiosks with 60s idle reset protection.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-xs font-mono text-blue-400 font-bold">
              <span>Launch Kiosk Mode</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 3: Kitchen Display System (KDS) */}
          <Link
            href="/kitchen"
            className="group p-6 rounded-2xl bg-[#14120E] border border-neutral-800 hover:border-emerald-500/60 transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                  Kitchen Display (KDS)
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Live real-time order stream, audio chimes, course pacing (Starter, Main, Dessert) & hold/fire controls.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
              <span>Launch Kitchen Display</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 4: Admin & Multi-Venue Management */}
          <Link
            href="/admin"
            className="group p-6 rounded-2xl bg-[#14120E] border border-neutral-800 hover:border-purple-500/60 transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-purple-500/10"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white group-hover:text-purple-400 transition-colors">
                  Venue Operations Admin
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Manage categories, items, modifier groups, locations, QR codes, sales metrics & AI business insights.
                </p>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-xs font-mono text-purple-400 font-bold">
              <span>Launch Admin Portal</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-6 bg-[#14120E]/50 border-t border-[#B68A2D]/15">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Multi-Tenant Capabilities
            </h2>
            <p className="text-sm text-neutral-400">
              Built from the ground up for modern, flexible food and beverage operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#191814] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#E5C378] flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">AI Voice Ordering</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                OpenAI Realtime assistant grounded in your business's live menu catalog. Understands international
                accents, dietary constraints, quantities, and order confirmations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#191814] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Split Payments & Checkout</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Guests can split their check equally or pay in full directly from their mobile phone without waiting for
                staff to bring paper bills or card terminals.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#191814] border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Course Pacing & Dispatch</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Kitchen stations organize items by course (Starters, Mains, Desserts, Drinks) with Hold & Fire
                controls for synchronized multi-course dining.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 px-6 bg-gradient-to-r from-[#191814] via-[#211E18] to-[#191814] border-t border-b border-[#B68A2D]/25 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Ready to upgrade your dining operations?
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Register your venue today. No complex setup or specialized hardware required—works on any smartphone,
            tablet, or touchscreen monitor.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold text-sm uppercase tracking-wider shadow-xl shadow-[#B68A2D]/30 hover:opacity-95 transition-all"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/80 py-8 px-6 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#E5C378] font-bold">AIVORA</span>
            <span>• All-in-One Autonomous Hospitality SaaS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/register" className="hover:text-white transition">
              Register Venue
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Staff Login
            </Link>
            <Link href="/kitchen" className="hover:text-white transition">
              Kitchen Display
            </Link>
            <Link href="/admin" className="hover:text-white transition">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}