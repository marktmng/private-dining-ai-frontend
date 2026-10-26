"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerVenue } from "@/lib/api";
import {
  UtensilsCrossed,
  Building,
  Coffee,
  Sparkles,
  Truck,
  Monitor,
  ShoppingBag,
  Store,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  User,
  MapPin,
  Phone,
  Coins,
  ChevronRight,
} from "lucide-react";

interface BusinessOption {
  type: string;
  label: string;
  description: string;
  icon: any;
  defaultLocation: string;
}

const BUSINESS_OPTIONS: BusinessOption[] = [
  {
    type: "RESTAURANT",
    label: "Restaurant & Bar",
    description: "Tables, patio seating, coursed dining & bar tabs",
    icon: UtensilsCrossed,
    defaultLocation: "Table 1 (QR Dining)",
  },
  {
    type: "HOTEL",
    label: "Hotel & Resort",
    description: "Room service, pool cabanas & guest suite tablets",
    icon: Building,
    defaultLocation: "Room 101 (Room Service)",
  },
  {
    type: "CAFE",
    label: "Cafe & Bakery",
    description: "Espresso counter, pastry display & quick pickup",
    icon: Coffee,
    defaultLocation: "Counter Pickup (QR)",
  },
  {
    type: "ICE_CREAM_SHOP",
    label: "Ice Cream & Gelato",
    description: "Scoop bars, custom cones & toppings kiosk",
    icon: Sparkles,
    defaultLocation: "Kiosk 01 (Touchscreen)",
  },
  {
    type: "FOOD_KIOSK",
    label: "Beach & Street Kiosk",
    description: "Self-service touchscreen kiosk & fast window",
    icon: Monitor,
    defaultLocation: "Kiosk 01 (Self-Order)",
  },
  {
    type: "FOOD_TRUCK",
    label: "Food Truck & Pop-up",
    description: "Window QR code ordering & buzzer notifications",
    icon: Truck,
    defaultLocation: "Window Pickup (QR)",
  },
  {
    type: "TAKEAWAY",
    label: "Takeaway & Snack Bar",
    description: "Express ordering, counter collections & drinks",
    icon: ShoppingBag,
    defaultLocation: "Pickup Bay 1",
  },
  {
    type: "OTHER",
    label: "Other Hospitality",
    description: "Custom cabins, food halls & dining concepts",
    icon: Store,
    defaultLocation: "Order Point 1",
  },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "AUD", symbol: "$", label: "Australian Dollar ($)" },
  { code: "CAD", symbol: "$", label: "Canadian Dollar ($)" },
  { code: "NZD", symbol: "$", label: "New Zealand Dollar ($)" },
  { code: "SGD", symbol: "$", label: "Singapore Dollar ($)" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen (¥)" },
];

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [step, setStep] = useState<1 | 2>(1);
  const [businessType, setBusinessType] = useState<string>("RESTAURANT");
  const [restaurantName, setRestaurantName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<any | null>(null);

  const selectedBusiness = BUSINESS_OPTIONS.find((b) => b.type === businessType) || BUSINESS_OPTIONS[0];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!restaurantName.trim()) {
      setErrorMessage("Please enter your venue or business name.");
      return;
    }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
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

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerVenue({
        restaurantName: restaurantName.trim(),
        businessType,
        currency,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        name: ownerName.trim() || restaurantName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.token) {
        localStorage.setItem("aivora_auth_token", response.token);
      }

      setRegisteredData(response.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register venue. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
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
          <span className="text-neutral-400 hidden sm:inline">Already registered?</span>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg border border-[#B68A2D]/40 text-[#E5C378] hover:bg-[#B68A2D]/10 hover:border-[#B68A2D] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          {/* Progress / Step Header */}
          {!registeredData && (
            <div className="mb-8 text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider bg-[#B68A2D]/10 border border-[#B68A2D]/30 text-[#E5C378]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B68A2D]" />
                Self-Service Business Onboarding
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Register Your Hospitality Business
              </h1>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                Set up your digital menus, ordering locations, touchscreen kiosk, and KDS in under 60 seconds.
              </p>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-3 pt-3">
                <div
                  className={`flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-lg ${
                    step === 1 ? "bg-[#B68A2D]/20 text-[#E5C378] font-bold border border-[#B68A2D]/40" : "text-neutral-500"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#B68A2D] text-[#12110D] flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  <span>Venue Identity</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
                <div
                  className={`flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-lg ${
                    step === 2 ? "bg-[#B68A2D]/20 text-[#E5C378] font-bold border border-[#B68A2D]/40" : "text-neutral-500"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
                  <span>Owner Account</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-mono flex items-center gap-3 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {registeredData ? (
            <div className="bg-[#14120E] border border-[#B68A2D]/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Welcome to AIVORA, {registeredData.restaurantName}!
                </h2>
                <p className="text-sm text-neutral-400">
                  Your multi-tenant venue workspace has been created with default menu and ordering location.
                </p>
              </div>

              {/* Credentials / Details Summary */}
              <div className="bg-[#1C1A15] border border-[#B68A2D]/20 rounded-xl p-4 text-left font-mono text-xs space-y-2 text-neutral-300">
                <div className="flex justify-between border-b border-[#B68A2D]/10 pb-2">
                  <span className="text-neutral-500">Venue Slug:</span>
                  <span className="text-[#E5C378] font-bold">/dine/{registeredData.restaurantSlug}</span>
                </div>
                <div className="flex justify-between border-b border-[#B68A2D]/10 pb-2">
                  <span className="text-neutral-500">Business Model:</span>
                  <span className="text-white uppercase">{registeredData.businessType}</span>
                </div>
                <div className="flex justify-between border-b border-[#B68A2D]/10 pb-2">
                  <span className="text-neutral-500">Default Currency:</span>
                  <span className="text-white font-bold">{registeredData.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Owner Email:</span>
                  <span className="text-white">{registeredData.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => router.push("/admin")}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-[#B68A2D]/30 flex items-center justify-center gap-2"
                >
                  <span>Open Venue Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => router.push(`/kitchen`)}
                  className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <span>Launch Kitchen (KDS)</span>
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM CONTAINER */
            <div className="bg-[#14120E] border border-[#B68A2D]/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
              {/* STEP 1: BUSINESS IDENTITY */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-6">
                  {/* Business Type Selector Grid */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-3">
                      Select Your Business Vertical
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BUSINESS_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = businessType === opt.type;
                        return (
                          <div
                            key={opt.type}
                            onClick={() => setBusinessType(opt.type)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected
                                ? "bg-[#B68A2D]/15 border-[#B68A2D] text-white shadow-md shadow-[#B68A2D]/10"
                                : "bg-[#1C1A15] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isSelected ? "bg-[#B68A2D] text-[#12110D]" : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${isSelected ? "text-[#E5C378]" : "text-neutral-200"}`}>
                                {opt.label}
                              </p>
                              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">{opt.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Venue Name */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-[#B68A2D]" />
                      <span>Business / Venue Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="e.g. The Grand Pavilion, Coastal Kiosk, Bella Gelato"
                      className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  {/* Currency & Phone Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold mb-1.5 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#B68A2D]" />
                        <span>Operating Currency</span>
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#B68A2D]" />
                        <span>Business Phone (Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +1 555-0192"
                        className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Physical Address / City */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B68A2D]" />
                      <span>Location / Address (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Pier 4, Waterfront Promenade, San Francisco"
                      className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition"
                    />
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-[#B68A2D]/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue to Account Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: OWNER ACCOUNT CREDENTIALS */}
              {step === 2 && (
                <form onSubmit={handleRegister} className="space-y-6">
                  {/* Selected Venue Pill */}
                  <div className="p-3 bg-[#1C1A15] border border-[#B68A2D]/20 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Registering:</span>
                      <span className="text-white font-bold">{restaurantName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#B68A2D]/20 text-[#E5C378]">
                        {selectedBusiness.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[#E5C378] hover:underline text-[11px]"
                    >
                      Change
                    </button>
                  </div>

                  {/* Owner Full Name */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#B68A2D]" />
                      <span>Owner / Manager Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#B68A2D]" />
                      <span>Work / Business Email *</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@yourvenue.com"
                      className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  {/* Password & Confirm Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#B68A2D]" />
                        <span>Password *</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#E5C378] font-bold mb-1.5 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#B68A2D]" />
                        <span>Confirm Password *</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-[#1C1A15] border border-neutral-800 focus:border-[#B68A2D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Provisioning preview info */}
                  <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-neutral-400 text-xs font-mono space-y-1">
                    <p className="text-white font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#B68A2D]" />
                      <span>Automatic Provisioning Included:</span>
                    </p>
                    <p>• Initial Main Menu catalog created & set active</p>
                    <p>• Default location provisioned: {selectedBusiness.defaultLocation}</p>
                    <p>• Instant QR code generation & KDS real-time events enabled</p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-[#B68A2D]/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#12110D]/30 border-t-[#12110D] rounded-full animate-spin" />
                          <span>Provisioning Venue...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Complete Registration</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#B68A2D]/10 py-6 text-center text-xs text-neutral-500 font-mono">
        <p>AIVORA Autonomous Hospitality Systems • Multi-Tenant Enterprise SaaS</p>
      </footer>
    </div>
  );
}
