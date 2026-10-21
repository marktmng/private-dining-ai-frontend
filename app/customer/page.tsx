"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AnimeRadarDial from "@/components/AnimeRadarDial";
import SplashCalibration from "@/components/SplashCalibration";
import TacticalAssistantPanel from "@/components/TacticalAssistantPanel";
import TacticalDock, { type ActiveView } from "@/components/TacticalDock";
import TacticalHeader from "@/components/TacticalHeader";
import TacticalLoginModal from "@/components/LoginModal";
import TacticalMenuCodex from "@/components/TacticalMenuCodex";
import TacticalSommelier from "@/components/TacticalSommelier";
import TacticalTicker from "@/components/TacticalTicker";

import { getMe, getMenu, getOrderById, submitOrder, updateOrderStatus } from "@/lib/api";
import { matchOrderFromTranscript, type MatchedOrderItem } from "@/lib/orderMatcher";
import {
  startRealtimeVoiceSession,
  type RealtimeVoiceSession,
  type TranscriptUpdate,
} from "@/lib/realtime";
import type {
  AuthUser,
  CreateOrderPayload,
  MenuItem as MenuItemType,
  PersistedOrder,
} from "@/types/order";

const TOKEN_STORAGE_KEY = "aivora_auth_token";

interface TranscriptEntry {
  id: string;
  isFinal: boolean;
  role: TranscriptUpdate["role"];
  text: string;
}

export default function CustomerPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant A");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  // Active view tab (dock selection)
  const [activeView, setActiveView] = useState<ActiveView>("dial");

  // Right column tab switcher: "both" | "order" | "menu"
  const [rightPanelTab, setRightPanelTab] = useState<"menu" | "order">("order");

  // Voice & Conversation state
  const [conversation, setConversation] = useState<TranscriptEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Menu state
  const [menu, setMenu] = useState<MenuItemType[]>([]);
  const [menuError, setMenuError] = useState("");
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [status, setStatus] = useState("System armed. Speak to begin your order.");

  // Direct authoritative order items state (ensuring 100% accuracy)
  const [orderItems, setOrderItems] = useState<MatchedOrderItem[]>([]);

  // Order submission and persistence state
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitOrderError, setSubmitOrderError] = useState<string | null>(null);
  const [persistedOrder, setPersistedOrder] = useState<PersistedOrder | null>(null);

  // Staff Call State
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);

  // Unmatched voice phrase feedback state
  const [unmatchedPhrase, setUnmatchedPhrase] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeVoiceSession | null>(null);

  // 1. Check saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) return;

    getMe(savedToken)
      .then((data) => {
        setAuthToken(savedToken);
        setCurrentUser({
          userId: data.user.id,
          email: data.user.email,
          name: data.user.name,
          restaurantId: data.restaurant?.id || "",
          restaurantName: data.restaurant?.name || "Restaurant A",
          role: data.role,
        });
        if (data.restaurant?.name) {
          setRestaurantName(data.restaurant.name);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Invalid session";
        console.warn("Stored token is invalid or expired:", msg);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
      });
  }, []);

  // 2. Load restaurant menu whenever authToken changes
  useEffect(() => {
    let isCancelled = false;

    async function loadMenu() {
      try {
        setIsMenuLoading(true);
        setMenuError("");
        const items = await getMenu(authToken ?? undefined);
        if (!isCancelled) {
          setMenu(items);
          setMenuError("");
        }
      } catch (error) {
        console.error(error);
        if (!isCancelled) {
          setMenuError("Menu is temporarily unavailable.");
        }
      } finally {
        if (!isCancelled) {
          setIsMenuLoading(false);
        }
      }
    }

    void loadMenu();

    return () => {
      isCancelled = true;
    };
  }, [authToken]);

  // Handle successful login
  const handleLoginSuccess = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setAuthToken(token);
    setCurrentUser(user);
    if (user.restaurantName) {
      setRestaurantName(user.restaurantName);
    }
    setPersistedOrder(null);
    setConversation([]);
    setOrderItems([]);
    setStatus(`Database synced with ${user.restaurantName || "Restaurant A"}`);
  }, []);

  // Handle logout
  const handleSignOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setPersistedOrder(null);
    setConversation([]);
    setOrderItems([]);
    setStatus("Switched to offline prototype mode.");
  }, []);

  // Extract user speech transcript
  const currentOrder = useMemo(() => {
    return conversation
      .filter((entry) => entry.role === "user" && entry.isFinal)
      .map((entry) => entry.text.trim())
      .filter(Boolean)
      .join("\n");
  }, [conversation]);

  // Sync voice matched items into order items with 100% price accuracy
  useEffect(() => {
    if (!currentOrder || menu.length === 0) {
      setUnmatchedPhrase(null);
      return;
    }
    const match = matchOrderFromTranscript(currentOrder, menu);

    if (match.unmatchedPhrases && match.unmatchedPhrases.length > 0) {
      setUnmatchedPhrase(match.unmatchedPhrases[match.unmatchedPhrases.length - 1]);
    } else {
      setUnmatchedPhrase(null);
    }

    if (match.items.length > 0) {
      setOrderItems((currentItems) => {
        const itemMap = new Map<string, MatchedOrderItem>();

        // Keep current items
        currentItems.forEach((it) => {
          itemMap.set(it.id, { ...it });
        });

        // Upsert voice matched items
        match.items.forEach((mItem) => {
          const existing = itemMap.get(mItem.id);
          const unitPrice = Number(mItem.price);

          if (existing) {
            existing.quantity = Math.max(existing.quantity, mItem.quantity);
            existing.price = unitPrice;
            existing.lineTotal = Number((existing.quantity * unitPrice).toFixed(2));
            if (mItem.notes) existing.notes = mItem.notes;
          } else {
            itemMap.set(mItem.id, {
              ...mItem,
              price: unitPrice,
              lineTotal: Number((mItem.quantity * unitPrice).toFixed(2)),
            });
          }
        });

        return Array.from(itemMap.values());
      });
    }
  }, [currentOrder, menu]);

  // Calculate 100% authoritative order total
  const calculatedTotal = useMemo(() => {
    return Number(
      orderItems.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
    );
  }, [orderItems]);

  // Order quantities map for menu codex checkmarks
  const orderQuantities = useMemo(() => {
    const qMap: Record<string, number> = {};
    orderItems.forEach((it) => {
      qMap[it.id] = it.quantity;
      qMap[it.name] = it.quantity;
    });
    return qMap;
  }, [orderItems]);

  const displayStatus =
    calculatedTotal > 0
      ? `Active order total: $${calculatedTotal.toFixed(2)}`
      : status;

  const conversationText = useMemo(() => {
    return conversation
      .map((entry) => {
        const label = entry.role === "user" ? "You" : "AI";
        const text =
          entry.role === "assistant"
            ? normalizeAssistantText(entry.text)
            : entry.text.trim();
        if (!text) return "";

        return `${label}: ${text}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }, [conversation]);

  const upsertTranscript = useCallback((update: TranscriptUpdate) => {
    setConversation((current) => {
      const index = current.findIndex(
        (entry) => entry.id === update.id && entry.role === update.role
      );

      if (index === -1) {
        return [...current, update];
      }

      return current.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, ...update } : entry
      );
    });
  }, []);

  const stopListening = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setIsConnecting(false);
    setIsListening(false);
    setIsSpeaking(false);
    setStatus("Voice transmission ended.");
  }, []);

  const startListening = useCallback(async () => {
    if (persistedOrder) {
      setPersistedOrder(null);
    }

    setConversation([]);
    setIsConnecting(true);
    setStatus("Synchronizing microphone & acoustic matrices...");

    try {
      const session = await startRealtimeVoiceSession({
        authToken: authToken ?? undefined,
        onAssistantSpeakingChange: setIsSpeaking,
        onDisconnected: () => {
          sessionRef.current = null;
          setIsConnecting(false);
          setIsListening(false);
          setIsSpeaking(false);
          setStatus("Voice session ended.");
        },
        onError: (message) => {
          setStatus(message);
        },
        onReady: () => {
          setIsListening(true);
          setIsConnecting(false);
          setStatus("Voice channel armed • Speak naturally");
        },
        onStatusChange: setStatus,
        onTranscript: upsertTranscript,
      });

      sessionRef.current = session;
      setIsConnecting(false);
      setIsListening(true);
    } catch (error) {
      console.error(error);
      sessionRef.current = null;
      setIsConnecting(false);
      setIsListening(false);
      setIsSpeaking(false);
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to connect to voice engine."
      );
    }
  }, [authToken, persistedOrder, upsertTranscript]);

  const toggleListening = useCallback(() => {
    if (sessionRef.current) {
      stopListening();
      return;
    }

    void startListening();
  }, [startListening, stopListening]);

  // Direct 100% Accurate Item Addition from Menu Click
  const handleAddMenuItemDirect = useCallback((item: MenuItemType) => {
    const key = item.id || item.name;
    const priceNum = Number(item.price);

    setOrderItems((current) => {
      const existingIndex = current.findIndex(
        (it) => it.id === key || it.name.toLowerCase() === item.name.toLowerCase()
      );

      if (existingIndex >= 0) {
        const updated = [...current];
        const ex = updated[existingIndex];
        const newQty = ex.quantity + 1;
        updated[existingIndex] = {
          ...ex,
          quantity: newQty,
          price: priceNum,
          lineTotal: Number((newQty * priceNum).toFixed(2)),
        };
        return updated;
      } else {
        return [
          ...current,
          {
            id: key,
            name: item.name,
            quantity: 1,
            price: priceNum,
            lineTotal: Number(priceNum.toFixed(2)),
            confidence: 1.0,
            status: "matched",
            matchedText: item.name,
          },
        ];
      }
    });

    // Also add to conversation transcript for AI context
    setConversation((curr) => [
      ...curr,
      {
        id: `btn-${Date.now()}`,
        isFinal: true,
        role: "user",
        text: `I'd like to add one ${item.name}`,
      },
    ]);

    setStatus(`Added 1x ${item.name} ($${priceNum.toFixed(2)}) to active order.`);
  }, []);

  // Stepper: Increment quantity (+1)
  const handleIncrementItem = useCallback((id: string) => {
    setOrderItems((current) =>
      current.map((it) => {
        if (it.id === id) {
          const newQty = it.quantity + 1;
          return {
            ...it,
            quantity: newQty,
            lineTotal: Number((newQty * it.price).toFixed(2)),
          };
        }
        return it;
      })
    );
  }, []);

  // Stepper: Decrement quantity (-1)
  const handleDecrementItem = useCallback((id: string) => {
    setOrderItems((current) =>
      current
        .map((it) => {
          if (it.id === id) {
            const newQty = it.quantity - 1;
            return {
              ...it,
              quantity: newQty,
              lineTotal: Number((newQty * it.price).toFixed(2)),
            };
          }
          return it;
        })
        .filter((it) => it.quantity > 0)
    );
  }, []);

  // Remove individual item
  const handleRemoveItem = useCallback((id: string) => {
    setOrderItems((current) => current.filter((it) => it.id !== id));
  }, []);

  // Clear all items in order
  const handleClearOrder = useCallback(() => {
    setOrderItems([]);
    setConversation([]);
    setStatus("Order cleared. Ready for new selections.");
  }, []);

  // Order Submission Handler
  const handleSubmitConfirmedOrder = useCallback(async () => {
    if (orderItems.length === 0) {
      setSubmitOrderError("No recognized items in order list.");
      return;
    }

    if (!authToken) {
      // Prototype simulation mode: create simulated persisted order so the user can test the full ticket lifecycle
      setIsSubmittingOrder(true);
      setSubmitOrderError(null);
      setTimeout(() => {
        setIsSubmittingOrder(false);
        const protoId = `proto-${Date.now().toString(36)}`;
        setPersistedOrder({
          id: protoId,
          restaurantId: "proto-restaurant",
          status: "SENT_TO_KITCHEN",
          total: calculatedTotal,
          specialInstructions: specialInstructions.trim() || null,
          items: orderItems.map((item, idx) => ({
            id: `proto-item-${idx}`,
            orderId: protoId,
            menuItemId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.lineTotal,
            notes: item.notes || null,
            menuItem: {
              id: item.id,
              name: item.name,
              price: item.price,
            },
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setStatus(
          `Prototype order #${protoId.slice(0, 8)} simulated & dispatched to kitchen preview! Total: $${calculatedTotal.toFixed(2)}`
        );
      }, 500);
      return;
    }

    const missingIds = orderItems.filter((i) => !i.id);
    if (missingIds.length > 0) {
      setSubmitOrderError("Certain items lack valid database identifier.");
      return;
    }

    setIsSubmittingOrder(true);
    setSubmitOrderError(null);

    try {
      const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: CreateOrderPayload = {
        idempotencyKey,
        specialInstructions: specialInstructions.trim() || undefined,
        items: orderItems.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      };

      const created = await submitOrder(payload, authToken);

      let finalOrder = created;
      try {
        await updateOrderStatus(created.id, "CONFIRMED", authToken);
        finalOrder = await updateOrderStatus(created.id, "SENT_TO_KITCHEN", authToken);
      } catch (transErr) {
        console.warn("Notice updating order status:", transErr);
      }

      setPersistedOrder(finalOrder);
      setStatus(
        `Order #${finalOrder.id.slice(0, 8)} confirmed and dispatched to kitchen! Total: $${Number(finalOrder.total).toFixed(2)}`
      );

      if (sessionRef.current) {
        stopListening();
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to transmit order to kitchen.";
      console.error("Order submission error:", errorMsg);
      setSubmitOrderError(errorMsg);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [authToken, calculatedTotal, orderItems, specialInstructions, stopListening]);

  const handleResetOrder = useCallback(() => {
    setPersistedOrder(null);
    setOrderItems([]);
    setConversation([]);
    setSpecialInstructions("");
    setSubmitOrderError(null);
    setStatus("System ready for next order.");
  }, []);

  // Quick prompt handler (clicking prompts or pairings adds to transcript)
  const handleQuickPrompt = useCallback(
    (promptText: string) => {
      const userEntry: TranscriptEntry = {
        id: `prompt-${Date.now()}`,
        isFinal: true,
        role: "user",
        text: promptText,
      };
      setConversation((current) => [...current, userEntry]);
      setStatus(`Processed instruction: "${promptText}"`);
    },
    []
  );

  // Waiter Call Handler
  const handleCallWaiter = useCallback(() => {
    setIsCallingWaiter(true);
    setStatus("🛎️ Private dining butler notified for Table VIP-01.");
    setTimeout(() => {
      setIsCallingWaiter(false);
    }, 4500);
  }, []);

  // Poll live order status
  useEffect(() => {
    if (!persistedOrder || !authToken) return;
    if (persistedOrder.status === "COMPLETED" || persistedOrder.status === "CANCELLED") return;

    const interval = setInterval(async () => {
      try {
        const latest = await getOrderById(persistedOrder.id, authToken);
        if (latest && latest.status !== persistedOrder.status) {
          setPersistedOrder(latest);
          if (latest.status === "PREPARING") {
            setStatus(`Order #${latest.id.slice(0, 8)} is now being prepared by the executive chef.`);
          } else if (latest.status === "READY") {
            setStatus(`Order #${latest.id.slice(0, 8)} is PLATED & READY for service.`);
          } else if (latest.status === "COMPLETED") {
            setStatus(`Order #${latest.id.slice(0, 8)} service fulfilled.`);
          } else if (latest.status === "CANCELLED") {
            setStatus(
              `Order #${latest.id.slice(0, 8)} cancelled: ${
                latest.specialInstructions || "No reason specified"
              }`
            );
          }
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [persistedOrder, authToken]);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#191814] text-[#F3EFE6] tactical-grid flex flex-col justify-between overflow-x-hidden pb-16 lg:pb-0 select-none">
      {/* Optional Splash Calibration Overlay */}
      {showSplash && (
        <SplashCalibration
          showInitially={true}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Top Telemetry Header */}
      <TacticalHeader
        user={currentUser}
        restaurantName={restaurantName}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        menuItemCount={menu.length}
        currentPath="/customer"
      />

      {/* Main Workspace: Left Dock + Center Stage + Right Menu & Order Hub */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Tactical Rail Dock */}
        <TacticalDock
          activeView={activeView}
          onSelectView={setActiveView}
          orderCount={orderItems.reduce((acc, it) => acc + it.quantity, 0)}
          onCalibrate={() => setShowSplash(true)}
          onCallWaiter={handleCallWaiter}
          isCallingWaiter={isCallingWaiter}
        />

        {/* Responsive Grid: Center Voice Hub & Right Menu/Order Console */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Center Stage: Voice Core or Full Screen Views */}
            <div className="lg:col-span-7 flex flex-col items-center space-y-5">
              {/* Voice Core Dial Hub */}
              {activeView === "dial" && (
                <div className="w-full flex flex-col items-center">
                  <AnimeRadarDial
                    disabled={isConnecting}
                    isConnecting={isConnecting}
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    onToggleListening={toggleListening}
                    statusText={displayStatus}
                  />

                  {/* Telemetry Feature Capsules beneath Dial */}
                  <div className="w-full max-w-xl mt-3 grid grid-cols-3 gap-2 font-mono text-center">
                    <button
                      type="button"
                      onClick={() => setRightPanelTab("menu")}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all shadow-sm flex flex-col items-center gap-0.5 cursor-pointer ${
                        rightPanelTab === "menu"
                          ? "bg-[#2A261E] border-[#B68A2D] text-[#E5C378]"
                          : "bg-[#211F1A] border-[#B68A2D]/30 text-[#F3EFE6]/70 hover:text-white"
                      }`}
                    >
                      <span>📖 BROWSE MENU</span>
                      <span className="text-[9px] text-[#B68A2D]/80">
                        {menu.length} SELECTIONS
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView("sommelier")}
                      className="p-2 rounded-xl bg-[#211F1A] border border-[#B68A2D]/30 hover:border-[#B68A2D] text-[#E5C378] text-[11px] font-bold transition-all shadow-sm flex flex-col items-center gap-0.5 cursor-pointer"
                    >
                      <span>🍷 SOMMELIER</span>
                      <span className="text-[9px] text-[#F3EFE6]/50">
                        CELLAR PAIRINGS
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRightPanelTab("order")}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all shadow-sm flex flex-col items-center gap-0.5 cursor-pointer ${
                        rightPanelTab === "order"
                          ? "bg-[#2A261E] border-[#10B981] text-[#10B981]"
                          : "bg-[#211F1A] border-[#B68A2D]/30 text-[#10B981] hover:text-[#34D399]"
                      }`}
                    >
                      <span>📋 DISPATCH</span>
                      <span className="text-[9px] text-[#10B981]">
                        {orderItems.reduce((acc, it) => acc + it.quantity, 0)} ITEMS (${calculatedTotal.toFixed(2)})
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Full Menu Codex (when switched via left dock) */}
              {activeView === "menu" && (
                <TacticalMenuCodex
                  menu={menu}
                  isLoading={isMenuLoading}
                  error={menuError}
                  isDbMenu={!!authToken}
                  orderQuantities={orderQuantities}
                  onSelectItem={handleAddMenuItemDirect}
                />
              )}

              {/* Sommelier Cellar View */}
              {activeView === "sommelier" && (
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setActiveView("dial")}
                      className="font-mono text-xs text-[#B68A2D] hover:text-[#E5C378] flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to Voice Core
                    </button>
                  </div>
                  <TacticalSommelier onAddPairing={handleQuickPrompt} />
                </div>
              )}

              {/* Full Order View on mobile when selected */}
              {activeView === "order" && (
                <div className="w-full lg:hidden">
                  <TacticalAssistantPanel
                    items={orderItems}
                    needsConfirmation={[]}
                    orderTranscript={currentOrder}
                    conversationText={conversationText}
                    total={calculatedTotal}
                    isAuthenticated={!!authToken}
                    isSubmitting={isSubmittingOrder}
                    submitError={submitOrderError}
                    onSubmitOrder={handleSubmitConfirmedOrder}
                    persistedOrder={persistedOrder}
                    onResetOrder={handleResetOrder}
                    specialInstructions={specialInstructions}
                    onSpecialInstructionsChange={setSpecialInstructions}
                    onQuickPrompt={handleQuickPrompt}
                    onIncrementItem={handleIncrementItem}
                    onDecrementItem={handleDecrementItem}
                    onRemoveItem={handleRemoveItem}
                    onClearOrder={handleClearOrder}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Menu & Order Console (Visible continuously on desktop) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
              {/* Right Column Mode Switcher */}
              <div className="flex items-center justify-between bg-[#201E19] border border-[#B68A2D]/30 rounded-xl p-1 font-mono text-xs shadow-md">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("order")}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightPanelTab === "order"
                      ? "bg-[#B68A2D] text-[#191814] shadow"
                      : "text-[#F3EFE6]/70 hover:text-white"
                  }`}
                >
                  <span>ORDER ({orderItems.reduce((acc, it) => acc + it.quantity, 0)})</span>
                  <span className="text-[10px] text-[#191814] bg-[#E5C378] px-1.5 rounded font-extrabold">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanelTab("menu")}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightPanelTab === "menu"
                      ? "bg-[#B68A2D] text-[#191814] shadow"
                      : "text-[#F3EFE6]/70 hover:text-white"
                  }`}
                >
                  <span>MENU CODEX</span>
                  <span className="text-[10px] bg-[#211F1A] text-[#E5C378] px-1.5 rounded">
                    {menu.length}
                  </span>
                </button>
              </div>

              {/* Conditional Display in Right Rail */}
              {rightPanelTab === "order" ? (
                <div className="space-y-4">
                  {/* Active Order Assistant Panel */}
                  <TacticalAssistantPanel
                    items={orderItems}
                    needsConfirmation={[]}
                    unmatchedPhrase={unmatchedPhrase}
                    orderTranscript={currentOrder}
                    conversationText={conversationText}
                    total={calculatedTotal}
                    isAuthenticated={!!authToken}
                    isSubmitting={isSubmittingOrder}
                    submitError={submitOrderError}
                    onSubmitOrder={handleSubmitConfirmedOrder}
                    persistedOrder={persistedOrder}
                    onResetOrder={handleResetOrder}
                    specialInstructions={specialInstructions}
                    onSpecialInstructionsChange={setSpecialInstructions}
                    onQuickPrompt={handleQuickPrompt}
                    onIncrementItem={handleIncrementItem}
                    onDecrementItem={handleDecrementItem}
                    onRemoveItem={handleRemoveItem}
                    onClearOrder={handleClearOrder}
                  />

                  {/* Quick Inline Menu Preview below Order */}
                  <div className="pt-2">
                    <TacticalMenuCodex
                      menu={menu}
                      isLoading={isMenuLoading}
                      error={menuError}
                      isDbMenu={!!authToken}
                      orderQuantities={orderQuantities}
                      onSelectItem={handleAddMenuItemDirect}
                      compact={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Full Menu Codex in Right Rail */}
                  <TacticalMenuCodex
                    menu={menu}
                    isLoading={isMenuLoading}
                    error={menuError}
                    isDbMenu={!!authToken}
                    orderQuantities={orderQuantities}
                    onSelectItem={handleAddMenuItemDirect}
                    compact={false}
                  />

                  {/* Compact Order Floating Status Card */}
                  {orderItems.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#211F1A] border border-[#10B981]/50 shadow-xl flex items-center justify-between font-mono text-xs">
                      <div>
                        <span className="text-[#10B981] font-bold block">
                          {orderItems.reduce((acc, it) => acc + it.quantity, 0)} Items Selected
                        </span>
                        <span className="text-sm font-extrabold text-[#E5C378]">
                          ${calculatedTotal.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRightPanelTab("order")}
                        className="px-4 py-2 rounded-lg bg-[#B68A2D] hover:bg-[#C89B37] text-[#191814] font-bold transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        Review & Transmit →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Ticker */}
      <TacticalTicker />

      {/* Restaurant Login Modal */}
      <TacticalLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </main>
  );
}

function normalizeAssistantText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "Order updated with latest culinary selections.";
  }

  return trimmed;
}
