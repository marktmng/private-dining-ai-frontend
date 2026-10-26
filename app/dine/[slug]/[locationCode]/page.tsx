"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getPublicCategorizedMenu,
  initiateGuestSession,
  submitGuestOrder,
  getGuestOrder,
  createPaymentIntent,
  confirmPayment,
  createEqualSplit,
} from "@/lib/api";
import type {
  CategorizedPublicMenu,
  GuestSessionData,
  MenuItem,
  ModifierGroup,
  ModifierOption,
  OrderingLocation,
  PersistedOrder,
  PublicRestaurantInfo,
} from "@/types/order";
import TacticalOrderTracker from "@/components/TacticalOrderTracker";
import {
  Utensils,
  ShoppingBag,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  Users,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  Mic,
  MicOff,
  Bell,
  Coffee,
  Check,
  Radio,
} from "lucide-react";

interface CartItem {
  id: string; // unique cart entry ID
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: ModifierOption[];
  notes?: string;
  course?: "STARTER" | "MAIN" | "DESSERT" | "DRINK";
  calculatedUnitPrice: number;
}

export default function GuestDinePage({
  params,
}: {
  params: Promise<{ slug: string; locationCode: string }>;
}) {
  const resolvedParams = use(params);
  const { slug, locationCode } = resolvedParams;

  // Session & Menu state
  const [session, setSession] = useState<GuestSessionData | null>(null);
  const [menuData, setMenuData] = useState<CategorizedPublicMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Category & Filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDietary, setSelectedDietary] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Customization Modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [modalModifiers, setModalModifiers] = useState<Record<string, string[]>>({}); // groupId -> array of optionIds
  const [modalNotes, setModalNotes] = useState("");
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalCourse, setModalCourse] = useState<"STARTER" | "MAIN" | "DESSERT" | "DRINK">("MAIN");

  // Active Order & Live Tracking state
  const [activeOrder, setActiveOrder] = useState<PersistedOrder | null>(null);
  const [splitShares, setSplitShares] = useState(2);
  const [splitResult, setSplitResult] = useState<{ perShareAmount: number; shares: number } | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [staffCalled, setStaffCalled] = useState(false);
  const [showTacticalTracker, setShowTacticalTracker] = useState(false);

  // Inactivity voice timeout (90s)
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Guest Session & Load Menu
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      initiateGuestSession(slug, locationCode),
      getPublicCategorizedMenu(slug, locationCode),
    ])
      .then(([sessionRes, menuRes]) => {
        if (!isMounted) return;
        setSession(sessionRes);
        setMenuData(menuRes);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load dining session";
        setLoadError(msg);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, locationCode]);

  // 2. Poll Active Order Status if an order has been submitted
  useEffect(() => {
    if (!activeOrder || !session) return;
    const interval = setInterval(() => {
      getGuestOrder(activeOrder.id, session.sessionToken)
        .then((updated) => {
          setActiveOrder(updated);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [activeOrder, session]);

  // Dietary options extracted from all items
  const allDietaryTags = useMemo(() => {
    if (!menuData) return [];
    const tags = new Set<string>();
    menuData.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        item.dietaryTags?.forEach((t) => tags.add(t.toLowerCase()));
      });
    });
    return Array.from(tags);
  }, [menuData]);

  // Filtered categories and items
  const visibleCategories = useMemo(() => {
    if (!menuData) return [];
    return menuData.categories
      .map((cat) => {
        const filteredItems = cat.items.filter((item) => {
          if (!item.active) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesName = item.name.toLowerCase().includes(q);
            const matchesDesc = item.description?.toLowerCase().includes(q);
            if (!matchesName && !matchesDesc) return false;
          }
          if (selectedDietary) {
            const hasTag = item.dietaryTags?.some((t) => t.toLowerCase() === selectedDietary.toLowerCase());
            if (!hasTag) return false;
          }
          return true;
        });
        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => {
        if (selectedCategoryId !== "ALL" && cat.id !== selectedCategoryId) return false;
        return cat.items.length > 0;
      });
  }, [menuData, selectedCategoryId, searchQuery, selectedDietary]);

  // Item customization helpers
  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    setModalQuantity(1);
    setModalNotes("");
    setModalCourse("MAIN");

    // Pre-populate default modifiers
    const initialMods: Record<string, string[]> = {};
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      item.modifierGroups.forEach((grp) => {
        const defaultOptions = grp.options.filter((o) => o.isDefault).map((o) => o.id);
        if (defaultOptions.length > 0) {
          initialMods[grp.id] = defaultOptions;
        } else if (grp.required && grp.options.length > 0) {
          initialMods[grp.id] = [grp.options[0].id];
        } else {
          initialMods[grp.id] = [];
        }
      });
    }
    setModalModifiers(initialMods);
  };

  const handleModifierToggle = (group: ModifierGroup, option: ModifierOption) => {
    const currentSelected = modalModifiers[group.id] || [];
    if (group.maxSelections === 1) {
      // Single selection radio
      setModalModifiers((prev) => ({ ...prev, [group.id]: [option.id] }));
    } else {
      // Multiple selection checkbox
      if (currentSelected.includes(option.id)) {
        setModalModifiers((prev) => ({
          ...prev,
          [group.id]: currentSelected.filter((id) => id !== option.id),
        }));
      } else {
        if (group.maxSelections && currentSelected.length >= group.maxSelections) return;
        setModalModifiers((prev) => ({
          ...prev,
          [group.id]: [...currentSelected, option.id],
        }));
      }
    }
  };

  // Calculate live price inside modal
  const modalCalculatedUnitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    let price = Number(customizingItem.price);
    if (customizingItem.modifierGroups) {
      customizingItem.modifierGroups.forEach((grp) => {
        const selectedIds = modalModifiers[grp.id] || [];
        grp.options.forEach((opt) => {
          if (selectedIds.includes(opt.id)) {
            price += Number(opt.priceAdjustment || 0);
          }
        });
      });
    }
    return price;
  }, [customizingItem, modalModifiers]);

  const handleAddToCartFromModal = () => {
    if (!customizingItem) return;

    // Validate required modifier groups
    if (customizingItem.modifierGroups) {
      for (const grp of customizingItem.modifierGroups) {
        const selected = modalModifiers[grp.id] || [];
        if (grp.required && selected.length < (grp.minSelections || 1)) {
          alert(`Please select an option for "${grp.name}".`);
          return;
        }
      }
    }

    const selectedOptionsList: ModifierOption[] = [];
    if (customizingItem.modifierGroups) {
      customizingItem.modifierGroups.forEach((grp) => {
        const ids = modalModifiers[grp.id] || [];
        grp.options.forEach((opt) => {
          if (ids.includes(opt.id)) selectedOptionsList.push(opt);
        });
      });
    }

    const newCartEntry: CartItem = {
      id: `${customizingItem.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      menuItem: customizingItem,
      quantity: modalQuantity,
      selectedModifiers: selectedOptionsList,
      notes: modalNotes.trim() || undefined,
      course: modalCourse,
      calculatedUnitPrice: modalCalculatedUnitPrice,
    };

    setCart((prev) => [...prev, newCartEntry]);
    setCustomizingItem(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (cartEntryId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartEntryId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((i): i is CartItem => i !== null)
    );
  };

  // Cart financial calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.calculatedUnitPrice * item.quantity, 0);
  }, [cart]);

  const taxRate = menuData?.restaurant.taxRate ?? 0.1;
  const cartTax = cartSubtotal * taxRate;
  const cartTotal = cartSubtotal + cartTax;
  const currencySymbol = menuData?.restaurant.currency === "EUR" ? "€" : menuData?.restaurant.currency === "GBP" ? "£" : "$";

  // Submit Order to backend
  const handleSubmitOrder = async () => {
    if (!session || cart.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const itemsPayload = cart.map((c) => ({
        menuItemId: c.menuItem.id!,
        quantity: c.quantity,
        notes: c.notes,
        course: c.course,
        modifierOptionIds: c.selectedModifiers.map((m) => m.id),
      }));

      const created = await submitGuestOrder({
        sessionToken: session.sessionToken,
        orderChannel: "QR",
        fulfillmentMethod: session.location?.fulfillmentMethod || "TABLE_SERVICE",
        specialInstructions: specialInstructions.trim() || undefined,
        items: itemsPayload,
      });

      setActiveOrder(created);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Payment Simulation
  const handlePayOrder = async () => {
    if (!activeOrder || !session) return;
    setIsPaying(true);
    try {
      const intent = await createPaymentIntent(activeOrder.id, Number(activeOrder.total), menuData?.restaurant.currency || "USD", session.sessionToken);
      await confirmPayment(intent.paymentId, `demo_card_${Date.now()}`);
      setPaymentSuccess(true);
      const updated = await getGuestOrder(activeOrder.id, session.sessionToken);
      setActiveOrder(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      alert(msg);
    } finally {
      setIsPaying(false);
    }
  };

  // Equal Split calculation
  const handleCalculateSplit = async () => {
    if (!activeOrder || !session) return;
    try {
      const split = await createEqualSplit(activeOrder.id, splitShares, session.sessionToken);
      setSplitResult({ perShareAmount: split.perShareAmount, shares: split.shares });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Split failed";
      alert(msg);
    }
  };

  // Voice Assistant with 90s Inactivity Auto-Stop
  const toggleVoice = () => {
    if (isVoiceOpen) {
      setIsVoiceOpen(false);
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    } else {
      setIsVoiceOpen(true);
      setVoiceTranscript("Listening... Speak your order naturally (e.g. 'Add two scoops of pistachio gelato in a waffle cone')");
      // 90 second cost control timeout
      voiceTimeoutRef.current = setTimeout(() => {
        setIsVoiceOpen(false);
      }, 90000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-medium tracking-tight">Initializing Dining Experience</h2>
        <p className="text-neutral-400 text-sm mt-1">Connecting to {slug}...</p>
      </div>
    );
  }

  if (loadError || !menuData || !session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold">Venue or Location Unavailable</h2>
        <p className="text-neutral-400 text-sm mt-2 max-w-md">
          {loadError || "We could not find the active menu for this venue and location."}
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm rounded-xl font-medium transition"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const { restaurant, location } = menuData;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-amber-500/30">
      {/* Top Banner / Restaurant Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-white shadow-lg shadow-amber-900/30">
              {restaurant.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-white leading-tight">{restaurant.name}</h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-amber-400 border border-neutral-700">
                  {restaurant.businessType.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {location ? (
                  <>
                    <span className="font-medium text-neutral-200">{location.name}</span>
                    <span>({location.type.replace(/_/g, " ")})</span>
                  </>
                ) : (
                  <span>Direct Guest Ordering</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Staff Assist / Call Button */}
            <button
              onClick={() => {
                setStaffCalled(true);
                setTimeout(() => setStaffCalled(false), 5000);
              }}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition ${
                staffCalled
                  ? "bg-emerald-950/80 border-emerald-600/50 text-emerald-300"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{staffCalled ? "Staff Notified" : "Call Staff"}</span>
            </button>

            {/* AI Voice Ordering Trigger */}
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition ${
                isVoiceOpen
                  ? "bg-amber-500 text-neutral-950 border-amber-400 font-semibold shadow-md shadow-amber-500/20"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-amber-500/50 hover:text-amber-400"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Order</span>
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-900/30 transition active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {cart.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-950 text-amber-400 text-[10px] font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Voice Assistant Floating Widget */}
      {isVoiceOpen && (
        <div className="bg-amber-950/60 border-b border-amber-600/40 p-4 px-6 text-sm flex items-center justify-between text-amber-200 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-neutral-950 animate-pulse">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">AIVORA Voice Assistant Armed</p>
              <p className="text-xs text-amber-300/80">{voiceTranscript}</p>
            </div>
          </div>
          <button
            onClick={toggleVoice}
            className="p-1 rounded-lg text-amber-300 hover:text-white hover:bg-amber-900/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Active Order Live Tracker Bar (if active order exists) */}
      {activeOrder && (
        <div className="bg-[#14120E] border-b border-[#B68A2D]/35 px-4 py-3 sm:px-8 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#25221B] border border-[#B68A2D]/40 text-[#E5C378] shadow-[0_0_12px_rgba(182,138,45,0.3)]">
                <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
              </span>
              <div>
                <p className="font-bold text-white tracking-wide">
                  Active Order #{activeOrder.orderNumber || activeOrder.id.slice(0, 6)}:{" "}
                  <span className="text-[#E5C378] uppercase font-bold tracking-wider">{activeOrder.status}</span>
                </p>
                <p className="text-neutral-400 text-xs">
                  {activeOrder.items.length} items • Total: {currencySymbol}
                  {Number(activeOrder.total).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTacticalTracker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#B68A2D]/20 to-[#E5C378]/20 hover:from-[#B68A2D]/30 hover:to-[#E5C378]/30 border border-[#B68A2D]/50 text-[#E5C378] font-bold rounded-xl transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-ping" />
                <span>LIVE HUD TRACKER</span>
              </button>

              {!paymentSuccess && activeOrder.status !== "CANCELLED" && (
                <>
                  <button
                    onClick={handlePayOrder}
                    disabled={isPaying}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isPaying ? "Processing..." : `Pay ${currencySymbol}${Number(activeOrder.total).toFixed(2)}`}</span>
                  </button>
                  <button
                    onClick={handleCalculateSplit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Split Bill</span>
                  </button>
                </>
              )}
              {paymentSuccess && (
                <span className="px-3 py-1 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Paid in Full
                </span>
              )}
            </div>
          </div>

          {/* Fullscreen HUD Tracking Modal */}
          {showTacticalTracker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
              <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto">
                <TacticalOrderTracker
                  initialOrder={activeOrder}
                  sessionToken={session?.sessionToken}
                  onClose={() => setShowTacticalTracker(false)}
                  currencySymbol={currencySymbol}
                />
              </div>
            </div>
          )}

          {/* Split Bill Popover Details */}
          {splitResult && (
            <div className="mt-3 p-3 bg-neutral-900/90 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Equal Split:</span> Each of the {splitResult.shares} guests pays{" "}
                <span className="text-amber-400 font-bold">
                  {currencySymbol}
                  {splitResult.perShareAmount.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setSplitResult(null)}
                className="text-neutral-400 hover:text-white text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Search & Dietary Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, ice cream, snacks..."
              className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition"
            />
          </div>

          {allDietaryTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedDietary(null)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition ${
                  selectedDietary === null
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                All Dietary
              </button>
              {allDietaryTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedDietary(selectedDietary === tag ? null : tag)}
                  className={`text-xs capitalize px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition ${
                    selectedDietary === tag
                      ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Navigation Bar (Phase 2 Requirement 5) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-800/80">
          <button
            onClick={() => setSelectedCategoryId("ALL")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition ${
              selectedCategoryId === "ALL"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800"
            }`}
          >
            All Categories
          </button>
          {menuData.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategoryId === cat.id
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-950/40 text-current">
                {cat.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Categorized Menu Items Grid */}
        <div className="space-y-10">
          {visibleCategories.map((cat) => (
            <section key={cat.id} className="space-y-4">
              <div className="border-b border-neutral-800 pb-2">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{cat.name}</span>
                  <span className="text-xs text-neutral-500 font-normal">({cat.items.length} items)</span>
                </h2>
                {cat.description && <p className="text-xs text-neutral-400 mt-0.5">{cat.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 rounded-2xl p-4 flex flex-col justify-between transition duration-200"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
                            {item.name}
                          </h3>
                          <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                            {item.description || "Freshly prepared to order with premium ingredients."}
                          </p>
                        </div>
                        <span className="font-extrabold text-amber-400 text-base sm:text-lg">
                          {currencySymbol}
                          {Number(item.price).toFixed(2)}
                        </span>
                      </div>

                      {/* Item Tags (Dietary & Preparation Time) */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {item.preparationTime && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            {item.preparationTime} min
                          </span>
                        )}
                        {item.dietaryTags?.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded-md"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-2 flex items-center justify-between border-t border-neutral-800/50">
                      <span className="text-[11px] text-neutral-400">
                        {item.modifierGroups && item.modifierGroups.length > 0
                          ? `${item.modifierGroups.length} options customizable`
                          : "Ready to order"}
                      </span>
                      <button
                        onClick={() => handleOpenCustomize(item)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 text-xs font-semibold rounded-xl transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Customize & Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {visibleCategories.length === 0 && (
            <div className="py-16 text-center text-neutral-500 space-y-2">
              <Utensils className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p className="text-base font-semibold text-neutral-400">No items match your search or filter</p>
              <p className="text-xs">Try selecting a different category or clearing search terms.</p>
            </div>
          )}
        </div>
      </main>

      {/* Item Customization Modal (Phase 2 Requirement 7) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-800 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">{customizingItem.name}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{customizingItem.description}</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Modifier Groups */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Kitchen Course Selector (if applicable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Course Pacing (Kitchen)</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(["STARTER", "MAIN", "DESSERT", "DRINK"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModalCourse(c)}
                      className={`py-1.5 rounded-lg border text-center font-medium capitalize transition ${
                        modalCourse === c
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {c.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modifier Groups */}
              {customizingItem.modifierGroups?.map((group) => {
                const selected = modalModifiers[group.id] || [];
                return (
                  <div key={group.id} className="space-y-2 border-t border-neutral-800/80 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{group.name}</span>
                      <span className="text-[11px] font-medium text-neutral-400">
                        {group.required ? (
                          <span className="text-amber-400 font-bold">Required</span>
                        ) : (
                          "Optional"
                        )}
                        {group.maxSelections > 1 ? ` (Pick up to ${group.maxSelections})` : ""}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.options.map((opt) => {
                        const isChecked = selected.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleModifierToggle(group, opt)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition text-left ${
                              isChecked
                                ? "bg-amber-500/10 border-amber-500/60 text-white"
                                : "bg-neutral-800/40 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                            }`}
                          >
                            <span className="font-medium">{opt.name}</span>
                            <span className="text-amber-400 font-semibold">
                              {Number(opt.priceAdjustment) > 0
                                ? `+${currencySymbol}${Number(opt.priceAdjustment).toFixed(2)}`
                                : "Included"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Special Instructions Notes */}
              <div className="space-y-1.5 border-t border-neutral-800/80 pt-4">
                <label className="text-xs font-semibold text-neutral-300">Special Notes for Kitchen</label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, dressing on side, allergy note"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-neutral-800 rounded-xl p-1 border border-neutral-700">
                <button
                  type="button"
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-xs">{modalQuantity}</span>
                <button
                  type="button"
                  onClick={() => setModalQuantity((q) => q + 1)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCartFromModal}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-between shadow-lg shadow-amber-500/20 transition active:scale-95"
              >
                <span>Add to Cart</span>
                <span>
                  {currencySymbol}
                  {(modalCalculatedUnitPrice * modalQuantity).toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-white text-base">Your Cart</h3>
                <span className="text-xs text-neutral-400">({cart.length} items)</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.map((entry) => (
                <div key={entry.id} className="p-3 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{entry.menuItem.name}</h4>
                      <p className="text-xs font-semibold text-amber-400">
                        {currencySymbol}
                        {(entry.calculatedUnitPrice * entry.quantity).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUpdateCartQuantity(entry.id, -entry.quantity)}
                      className="p-1 text-neutral-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {entry.selectedModifiers.length > 0 && (
                    <div className="text-[11px] text-neutral-400 space-y-0.5 border-t border-neutral-800 pt-1.5">
                      {entry.selectedModifiers.map((mod) => (
                        <div key={mod.id} className="flex justify-between">
                          <span>• {mod.name}</span>
                          {Number(mod.priceAdjustment) > 0 && (
                            <span className="text-neutral-500">
                              +{currencySymbol}
                              {Number(mod.priceAdjustment).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {entry.notes && (
                    <p className="text-[11px] text-amber-300/80 italic">Note: {entry.notes}</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] uppercase font-semibold text-neutral-400">
                      {entry.course}
                    </span>
                    <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-0.5 border border-neutral-700">
                      <button
                        onClick={() => handleUpdateCartQuantity(entry.id, -1)}
                        className="p-1 text-neutral-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center font-bold text-xs">{entry.quantity}</span>
                      <button
                        onClick={() => handleUpdateCartQuantity(entry.id, 1)}
                        className="p-1 text-neutral-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-20 text-center text-neutral-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs">Browse the categories and add dishes or drinks.</p>
                </div>
              )}
            </div>

            {/* Cart Summary & Checkout */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-neutral-800 bg-neutral-900/90 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400">Order Instructions</label>
                  <input
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Please bring drinks first, all at once"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1 text-xs text-neutral-400 border-t border-neutral-800 pt-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white font-medium">
                      {currencySymbol}
                      {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span className="text-white font-medium">
                      {currencySymbol}
                      {cartTax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-1">
                    <span>Total</span>
                    <span className="text-amber-400">
                      {currencySymbol}
                      {cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {submitError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40">
                    {submitError}
                  </p>
                )}

                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? "Transmitting Order..." : "Confirm & Place Order"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
