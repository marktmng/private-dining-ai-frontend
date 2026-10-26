"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  getPublicCategorizedMenu,
  initiateGuestSession,
  submitGuestOrder,
  createPaymentIntent,
  confirmPayment,
} from "@/lib/api";
import type {
  CategorizedPublicMenu,
  GuestSessionData,
  MenuItem,
  ModifierGroup,
  ModifierOption,
  PersistedOrder,
} from "@/types/order";
import {
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
  RotateCcw,
  Utensils,
  ChevronRight,
  Check,
} from "lucide-react";

interface KioskCartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: ModifierOption[];
  notes?: string;
  unitPrice: number;
}

export default function KioskPage({
  params,
}: {
  params: Promise<{ slug: string; locationCode: string }>;
}) {
  const resolvedParams = use(params);
  const { slug, locationCode } = resolvedParams;

  const [session, setSession] = useState<GuestSessionData | null>(null);
  const [menuData, setMenuData] = useState<CategorizedPublicMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [modalModifiers, setModalModifiers] = useState<Record<string, string[]>>({});
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState("");

  // Confirmed Order Ticket state
  const [confirmedOrder, setConfirmedOrder] = useState<PersistedOrder | null>(null);
  const [resetCountdown, setResetCountdown] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inactivity auto-reset timer (idle protection)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetKiosk = () => {
    setCart([]);
    setCustomizingItem(null);
    setConfirmedOrder(null);
    setSelectedCategoryId("ALL");
    setResetCountdown(30);
  };

  const handleUserActivity = () => {
    if (confirmedOrder) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Auto reset if idle for 60 seconds
    idleTimerRef.current = setTimeout(() => {
      resetKiosk();
    }, 60000);
  };

  // Load menu & guest session
  useEffect(() => {
    Promise.all([
      initiateGuestSession(slug, locationCode),
      getPublicCategorizedMenu(slug, locationCode),
    ])
      .then(([sess, menu]) => {
        setSession(sess);
        setMenuData(menu);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load kiosk";
        setLoadError(msg);
        setIsLoading(false);
      });
  }, [slug, locationCode]);

  // Countdown timer when order is confirmed
  useEffect(() => {
    if (!confirmedOrder) return;
    const interval = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          resetKiosk();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmedOrder]);

  const currencySymbol =
    menuData?.restaurant.currency === "EUR" ? "€" : menuData?.restaurant.currency === "GBP" ? "£" : "$";
  const taxRate = menuData?.restaurant.taxRate ?? 0.1;

  // Customization helpers
  const handleOpenCustomize = (item: MenuItem) => {
    handleUserActivity();
    setCustomizingItem(item);
    setModalQuantity(1);
    setModalNotes("");
    const initialMods: Record<string, string[]> = {};
    if (item.modifierGroups) {
      item.modifierGroups.forEach((grp) => {
        const defaultOpt = grp.options.filter((o) => o.isDefault).map((o) => o.id);
        if (defaultOpt.length > 0) initialMods[grp.id] = defaultOpt;
        else if (grp.required && grp.options.length > 0) initialMods[grp.id] = [grp.options[0].id];
        else initialMods[grp.id] = [];
      });
    }
    setModalModifiers(initialMods);
  };

  const modalUnitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    let price = Number(customizingItem.price);
    if (customizingItem.modifierGroups) {
      customizingItem.modifierGroups.forEach((grp) => {
        const selected = modalModifiers[grp.id] || [];
        grp.options.forEach((opt) => {
          if (selected.includes(opt.id)) price += Number(opt.priceAdjustment || 0);
        });
      });
    }
    return price;
  }, [customizingItem, modalModifiers]);

  const handleAddToCart = () => {
    handleUserActivity();
    if (!customizingItem) return;

    const selectedOptions: ModifierOption[] = [];
    if (customizingItem.modifierGroups) {
      customizingItem.modifierGroups.forEach((grp) => {
        const ids = modalModifiers[grp.id] || [];
        grp.options.forEach((opt) => {
          if (ids.includes(opt.id)) selectedOptions.push(opt);
        });
      });
    }

    setCart((prev) => [
      ...prev,
      {
        id: `${customizingItem.id}_${Date.now()}`,
        menuItem: customizingItem,
        quantity: modalQuantity,
        selectedModifiers: selectedOptions,
        notes: modalNotes.trim() || undefined,
        unitPrice: modalUnitPrice,
      },
    ]);
    setCustomizingItem(null);
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const cartTax = cartSubtotal * taxRate;
  const cartTotal = cartSubtotal + cartTax;

  const handleKioskCheckout = async () => {
    if (!session || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((c) => ({
        menuItemId: c.menuItem.id!,
        quantity: c.quantity,
        notes: c.notes,
        modifierOptionIds: c.selectedModifiers.map((m) => m.id),
      }));

      const created = await submitGuestOrder({
        sessionToken: session.sessionToken,
        orderChannel: "KIOSK",
        fulfillmentMethod: session.location?.fulfillmentMethod || "COUNTER_PICKUP",
        items: itemsPayload,
      });

      // Confirm payment automatically for kiosk simulated card terminal
      const intent = await createPaymentIntent(created.id, Number(created.total), menuData?.restaurant.currency || "USD", session.sessionToken);
      await confirmPayment(intent.paymentId, `kiosk_terminal_${Date.now()}`);

      setConfirmedOrder(created);
      setCart([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout error";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">Initializing Self-Service Kiosk</h2>
      </div>
    );
  }

  if (loadError || !menuData || !session) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-3xl font-extrabold">Kiosk Temporarily Offline</h2>
        <p className="text-neutral-400 mt-2">{loadError || "Could not connect to venue terminal."}</p>
      </div>
    );
  }

  const { restaurant, location } = menuData;

  // Order Confirmed Big Screen
  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-16 h-16" />
        </div>

        <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-4 py-1.5 rounded-full mb-3">
          Order Paid & Sent to Kitchen
        </span>

        <h1 className="text-4xl sm:text-5xl font-black text-white">Your Pickup Number</h1>
        <div className="my-6 px-10 py-6 bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 rounded-3xl font-black text-6xl sm:text-8xl shadow-2xl shadow-amber-500/30">
          #{confirmedOrder.orderNumber || confirmedOrder.id.slice(0, 4).toUpperCase()}
        </div>

        <p className="text-lg text-neutral-300 max-w-md">
          Please take your receipt. Your order is being prepared and will be called at the pickup counter.
        </p>

        <div className="mt-8 flex items-center gap-2 text-sm text-neutral-500">
          <Clock className="w-4 h-4" />
          <span>Screen resetting in {resetCountdown}s...</span>
        </div>

        <button
          onClick={resetKiosk}
          className="mt-6 px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl text-sm transition"
        >
          Place Another Order
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="min-h-screen bg-black text-neutral-100 flex flex-col select-none"
    >
      {/* Top Touchscreen Kiosk Banner */}
      <header className="bg-neutral-900 border-b border-neutral-800 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shadow-amber-900/40">
            {restaurant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{restaurant.name}</h1>
            <p className="text-sm text-neutral-400">
              Self-Service Kiosk • {location ? location.name : "Express Terminal"}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={resetKiosk}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Cancel / Start Over</span>
          </button>
        )}
      </header>

      {/* Main Kiosk Layout: Sidebar Categories + Grid Menu + Right Cart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Vertical Touch Bar */}
        <aside className="w-64 bg-neutral-950 border-r border-neutral-800/80 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              handleUserActivity();
              setSelectedCategoryId("ALL");
            }}
            className={`w-full text-left p-4 rounded-2xl font-bold text-sm transition flex items-center justify-between ${
              selectedCategoryId === "ALL"
                ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <span>All Categories</span>
          </button>
          {menuData.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                handleUserActivity();
                setSelectedCategoryId(cat.id);
              }}
              className={`w-full text-left p-4 rounded-2xl font-bold text-sm transition flex items-center justify-between ${
                selectedCategoryId === cat.id
                  ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20"
                  : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-950/40 text-current">
                {cat.items.length}
              </span>
            </button>
          ))}
        </aside>

        {/* Menu Items Grid */}
        <main className="flex-1 p-6 overflow-y-auto space-y-8">
          {menuData.categories
            .filter((c) => selectedCategoryId === "ALL" || c.id === selectedCategoryId)
            .map((cat) => (
              <section key={cat.id} className="space-y-4">
                <h2 className="text-xl font-black text-white border-b border-neutral-800 pb-2">
                  {cat.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenCustomize(item)}
                      className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition transform active:scale-98 shadow-xl"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-extrabold text-lg text-white">{item.name}</h3>
                          <span className="font-black text-xl text-amber-400">
                            {currencySymbol}
                            {Number(item.price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2 mt-2">
                          {item.description || "Freshly made to order."}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
                        <span className="text-neutral-500 font-medium">Touch to customize</span>
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center font-bold">
                          <Plus className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </main>

        {/* Right Touchscreen Cart */}
        <aside className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col justify-between p-6">
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <ShoppingBag className="w-6 h-6 text-amber-500" />
              <h3 className="font-black text-xl text-white">Your Tray</h3>
              <span className="text-xs text-neutral-400">({cart.length} items)</span>
            </div>

            <div className="space-y-3">
              {cart.map((entry) => (
                <div key={entry.id} className="p-3 bg-neutral-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{entry.menuItem.name}</h4>
                      <p className="text-xs text-amber-400 font-bold">
                        {currencySymbol}
                        {(entry.unitPrice * entry.quantity).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => setCart((prev) => prev.filter((i) => i.id !== entry.id))}
                      className="p-1 text-neutral-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {entry.selectedModifiers.map((mod) => (
                    <p key={mod.id} className="text-[11px] text-neutral-400">
                      • {mod.name}
                    </p>
                  ))}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() =>
                        setCart((prev) =>
                          prev
                            .map((i) => (i.id === entry.id ? { ...i, quantity: i.quantity - 1 } : i))
                            .filter((i) => i.quantity > 0)
                        )
                      }
                      className="w-7 h-7 rounded-lg bg-neutral-700 text-white flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{entry.quantity}</span>
                    <button
                      onClick={() =>
                        setCart((prev) =>
                          prev.map((i) => (i.id === entry.id ? { ...i, quantity: i.quantity + 1 } : i))
                        )
                      }
                      className="w-7 h-7 rounded-lg bg-neutral-700 text-white flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-24 text-center text-neutral-500 space-y-2">
                  <ShoppingBag className="w-12 h-12 mx-auto text-neutral-700 mb-2" />
                  <p className="text-base font-bold">Tray is Empty</p>
                  <p className="text-xs">Touch any item on the screen to add to your order.</p>
                </div>
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="border-t border-neutral-800 pt-4 space-y-4">
              <div className="space-y-1 text-sm text-neutral-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white font-bold">
                    {currencySymbol}
                    {cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                  <span className="text-white font-bold">
                    {currencySymbol}
                    {cartTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-2xl font-black text-white pt-2 border-t border-neutral-800">
                  <span>Total</span>
                  <span className="text-amber-400">
                    {currencySymbol}
                    {cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleKioskCheckout}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black py-5 px-6 rounded-2xl text-lg flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition"
              >
                <CreditCard className="w-6 h-6" />
                <span>{isSubmitting ? "Processing Payment..." : "Pay & Order Now"}</span>
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Kiosk Item Customization Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-8">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl p-8 flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-2xl font-black text-white">{customizingItem.name}</h3>
                <p className="text-sm text-neutral-400 mt-1">{customizingItem.description}</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-6">
              {customizingItem.modifierGroups?.map((group) => {
                const selected = modalModifiers[group.id] || [];
                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-base text-white">{group.name}</h4>
                      <span className="text-xs font-semibold text-neutral-400">
                        {group.required ? "Required" : "Optional"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {group.options.map((opt) => {
                        const isChecked = selected.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handleUserActivity();
                              if (group.maxSelections === 1) {
                                setModalModifiers((p) => ({ ...p, [group.id]: [opt.id] }));
                              } else {
                                setModalModifiers((p) => {
                                  const cur = p[group.id] || [];
                                  return {
                                    ...p,
                                    [group.id]: cur.includes(opt.id)
                                      ? cur.filter((x) => x !== opt.id)
                                      : [...cur, opt.id],
                                  };
                                });
                              }
                            }}
                            className={`p-4 rounded-2xl border text-sm font-bold flex justify-between items-center transition ${
                              isChecked
                                ? "bg-amber-500/20 border-amber-500 text-white"
                                : "bg-neutral-800/60 border-neutral-700 text-neutral-300"
                            }`}
                          >
                            <span>{opt.name}</span>
                            <span className="text-amber-400 text-xs">
                              {Number(opt.priceAdjustment) > 0
                                ? `+${currencySymbol}${Number(opt.priceAdjustment).toFixed(2)}`
                                : "Free"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-neutral-800 pt-6 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 bg-neutral-800 rounded-2xl p-2 border border-neutral-700">
                <button
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-neutral-700 text-white flex items-center justify-center font-bold"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="w-8 text-center font-black text-lg">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-neutral-700 text-white flex items-center justify-center font-bold"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-4 px-6 rounded-2xl text-base flex justify-between items-center shadow-xl shadow-amber-500/30 transition active:scale-95"
              >
                <span>Add to Tray</span>
                <span>
                  {currencySymbol}
                  {(modalUnitPrice * modalQuantity).toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
