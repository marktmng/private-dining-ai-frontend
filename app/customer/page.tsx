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
import TacticalOrderTracker from "@/components/TacticalOrderTracker";
import { Radio, QrCode, Copy, Check, X } from "lucide-react";

import { getMe, getMenu, getOrderById, submitOrder, updateOrderStatus, getPublicCategorizedMenu, trackOrderPublic } from "@/lib/api";
import {
  matchOrderFromTranscript,
  isVoiceConfirmation,
  type MatchedOrderItem,
} from "@/lib/orderMatcher";
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
  const [restaurantName, setRestaurantName] = useState<string>("");
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

  // Table Pass Modal State
  const [isTablePassOpen, setIsTablePassOpen] = useState(false);
  const [isPassLinkCopied, setIsPassLinkCopied] = useState(false);

  // Unmatched voice phrase feedback state
  const [unmatchedPhrase, setUnmatchedPhrase] = useState<string | null>(null);

  const sessionRef = useRef<RealtimeVoiceSession | null>(null);

  // 1. Check saved token and active order on mount
  useEffect(() => {
    const activeOrderId = localStorage.getItem("aivora_active_order_id");
    if (activeOrderId) {
      trackOrderPublic(activeOrderId)
        .then((ord) => {
          if (ord && ord.status !== "CANCELLED") {
            setPersistedOrder(ord);
          }
        })
        .catch(() => {});
    }

    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setIsMenuLoading(false);
      return;
    }

    getMe(savedToken)
      .then((data) => {
        setAuthToken(savedToken);
        setCurrentUser({
          userId: data.user.id,
          email: data.user.email,
          name: data.user.name,
          restaurantId: data.restaurant?.id || "",
          restaurantName: data.restaurant?.name || "",
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
        setRestaurantName("");
        setMenu([]);
        setIsMenuLoading(false);
      });
  }, []);

  // 2. Load restaurant menu whenever authToken changes (pure SaaS isolation)
  useEffect(() => {
    let isCancelled = false;

    async function loadMenu() {
      try {
        setIsMenuLoading(true);
        setMenuError("");

        if (authToken) {
          const items = await getMenu(authToken);
          if (!isCancelled) {
            setMenu(items);
            setMenuError("");
          }
        } else {
          // Public Guest fallback: Load active menu for primary venue
          const publicData = await getPublicCategorizedMenu("test-venue-saas");
          if (!isCancelled) {
            const allItems: MenuItemType[] = [];
            publicData.categories.forEach((cat: { items: MenuItemType[] }) => {
              cat.items.forEach((it: MenuItemType) => {
                if (it.active) allItems.push(it);
              });
            });
            setMenu(allItems);
            setRestaurantName(publicData.restaurant.name);
            setMenuError("");
          }
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
    setStatus(`Database synced with ${user.restaurantName || "Restaurant"}`);
  }, []);

  // Handle logout
  const handleSignOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setRestaurantName("");
    setMenu([]);
    setPersistedOrder(null);
    setConversation([]);
    setOrderItems([]);
    setStatus("Restaurant signed out • Connect a suite to begin");
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

    // Set order items derived directly from the active dialogue
    setOrderItems((currentManual) => {
      // If voice recognized order operations (add, remove, clear, correction), update active order state
      if (match.hasOrderOperations) {
        return match.items.map((mItem) => ({
          ...mItem,
          price: Number(mItem.price),
          lineTotal: Number((mItem.quantity * Number(mItem.price)).toFixed(2)),
        }));
      }
      return currentManual;
    });

    if (match.hasOrderOperations && match.lastAction) {
      if (match.lastAction.type === "clear") {
        setStatus("Order cleared by voice instruction. Ready for your selections.");
      } else if (match.lastAction.type === "remove" && match.lastAction.itemName) {
        setStatus(`Removed ${match.lastAction.itemName} from active order.`);
      }
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
    calculatedTotal > 0 && !persistedOrder
      ? `Order Total: $${calculatedTotal.toFixed(2)} • Shall I let the chef know? (Say "Yes" or "Confirm" whenever you're ready)`
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
        restaurantSlug: !authToken ? "restaurant-a-1791609281426" : undefined,
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
        text: `Add one ${item.name}`,
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

  // Order Submission Handler: Transmits confirmed order directly to PostgreSQL backend
  const handleSubmitConfirmedOrder = useCallback(async () => {
    if (orderItems.length === 0) {
      setSubmitOrderError("No recognized items in order list.");
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
        status: "SENT_TO_KITCHEN",
        specialInstructions: specialInstructions.trim() || undefined,
        items: orderItems.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      };

      // Real database submission to PostgreSQL via backend /order endpoint
      const created = await submitOrder(payload, authToken ?? undefined);

      let finalOrder = created;
      try {
        if (created.status === "PENDING" || created.status === "CONFIRMED") {
          finalOrder = await updateOrderStatus(created.id, "SENT_TO_KITCHEN", authToken ?? undefined);
        }
      } catch (transErr) {
        console.warn("Notice updating order status:", transErr);
      }

      setPersistedOrder(finalOrder);
      try {
        localStorage.setItem("aivora_active_order_id", finalOrder.id);
      } catch (e) {}
      setActiveView("track");
      setStatus(
        `Order #${finalOrder.id.slice(0, 8)} confirmed with the chef! Preparation is underway. Total: $${Number(finalOrder.total).toFixed(2)}`
      );

      // Append assistant confirmation text to dialogue log
      setConversation((curr) => {
        const hasRecentConfirm = curr.some(
          (c) => c.role === "assistant" && (c.text.toLowerCase().includes("chef") || c.text.toLowerCase().includes("prepare"))
        );
        if (!hasRecentConfirm) {
          return [
            ...curr,
            {
              id: `confirm-ack-${Date.now()}`,
              isFinal: true,
              role: "assistant",
              text: `Confirmed! I will let the chef know right away and we will begin preparing your order for you. Total: $${Number(finalOrder.total).toFixed(2)}. Please relax and keep an eye on the menu if you would like to add any drinks or desserts.`,
            },
          ];
        }
        return curr;
      });

      if (sessionRef.current) {
        // Allow the assistant's voice confirmation to finish playback naturally
        setTimeout(() => {
          if (sessionRef.current) {
            stopListening();
          }
        }, 4000);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to transmit order to kitchen.";
      console.error("Order submission error:", errorMsg);
      setSubmitOrderError(errorMsg);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [authToken, orderItems, specialInstructions, stopListening]);

  // Hands-free Voice Confirmation ("Confirmed", "Send it to Order", "Send to kitchen", etc.)
  useEffect(() => {
    if (orderItems.length === 0 || isSubmittingOrder || persistedOrder) return;

    const lastFinalUserEntry = conversation
      .filter((e) => e.role === "user" && e.isFinal)
      .pop();

    if (lastFinalUserEntry && isVoiceConfirmation(lastFinalUserEntry.text)) {
      setStatus("Voice confirmation detected: Preparing order with the chef...");
      void handleSubmitConfirmedOrder();
    }
  }, [conversation, orderItems.length, isSubmittingOrder, persistedOrder, handleSubmitConfirmedOrder]);

  const handleResetOrder = useCallback(() => {
    setPersistedOrder(null);
    try {
      localStorage.removeItem("aivora_active_order_id");
    } catch (e) {}
    setOrderItems([]);
    setConversation([]);
    setSpecialInstructions("");
    setSubmitOrderError(null);
    setStatus("System ready for next order.");
    setActiveView("dial");
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

  // Copy Table Session Link
  const handleCopyTableLink = useCallback(() => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setIsPassLinkCopied(true);
      setTimeout(() => setIsPassLinkCopied(false), 2000);
    }
  }, []);

  // Poll live order status until completed or cancelled
  useEffect(() => {
    if (!persistedOrder) return;
    if (persistedOrder.status === "COMPLETED" || persistedOrder.status === "CANCELLED") return;

    const interval = setInterval(async () => {
      try {
        const latest = await getOrderById(persistedOrder.id, authToken ?? undefined);
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
          hasActiveOrder={!!persistedOrder}
          activeOrderStatus={persistedOrder?.status}
          onCalibrate={() => setShowSplash(true)}
          onOpenTablePass={() => setIsTablePassOpen(true)}
        />

        {/* Responsive Grid: Center Voice Hub & Right Menu/Order Console */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Center Stage: Voice Core or Full Screen Views */}
            <div className="lg:col-span-7 flex flex-col items-center space-y-5">
              {/* Voice Core Dial Hub */}
              {activeView === "dial" && (
                <div className="w-full flex flex-col items-center">
                  {/* Active Order Telemetry Banner */}
                  {persistedOrder && (
                    <div className="w-full max-w-xl mb-4 p-3.5 rounded-2xl bg-[#211F1A]/95 border border-[#B68A2D]/50 shadow-[0_0_25px_rgba(182,138,45,0.25)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#06B6D4]" />
                        </span>
                        <div>
                          <span className="font-mono text-[10px] text-[#E5C378] tracking-widest uppercase block font-bold">
                            KITCHEN TELEMETRY // {persistedOrder.status}
                          </span>
                          <span className="text-xs font-semibold text-neutral-200">
                            Order #{persistedOrder.id.slice(0, 8)} • {persistedOrder.status === "PREPARING" ? "Executive chef is preparing your meal" : persistedOrder.status === "READY" ? "Plated & ready for service" : persistedOrder.status === "COMPLETED" ? "Fulfilled" : "Confirmed with kitchen"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveView("track")}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-mono text-[11px] font-bold hover:opacity-95 transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(182,138,45,0.4)] cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-[#12110D]" />
                        <span>VIEW HUD</span>
                      </button>
                    </div>
                  )}

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

              {/* Full Live Order Telemetry Tracker View */}
              {activeView === "track" && (
                <div className="w-full space-y-4">
                  {persistedOrder ? (
                    <>
                      <div className="flex items-center justify-between pb-1">
                        <button
                          type="button"
                          onClick={() => setActiveView("dial")}
                          className="font-mono text-xs text-[#B68A2D] hover:text-[#E5C378] flex items-center gap-1.5 cursor-pointer transition"
                        >
                          ← Back to Voice Core
                        </button>
                        <span className="font-mono text-[11px] text-[#22D3EE] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-ping" />
                          LIVE KITCHEN TELEMETRY
                        </span>
                      </div>

                      <TacticalOrderTracker
                        initialOrder={persistedOrder}
                        sessionToken={undefined}
                        onClose={() => setActiveView("dial")}
                        onOrderMore={() => {
                          setActiveView("dial");
                          setRightPanelTab("menu");
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-full p-8 rounded-2xl bg-[#211F1A]/80 border border-[#B68A2D]/30 text-center space-y-3 font-mono">
                      <Radio className="w-8 h-8 text-[#B68A2D]/60 mx-auto" />
                      <p className="text-sm text-neutral-300 font-bold">NO ACTIVE DISPATCH FOUND</p>
                      <p className="text-xs text-neutral-500">Submit an order via Voice Core or Menu Codex to track live kitchen preparation.</p>
                      <button
                        type="button"
                        onClick={() => setActiveView("dial")}
                        className="px-4 py-2 rounded-xl bg-[#B68A2D] text-[#12110D] text-xs font-bold font-mono hover:opacity-95 transition cursor-pointer"
                      >
                        Return to Voice Core
                      </button>
                    </div>
                  )}
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

      {/* Table Digital Pass & Companion QR Modal */}
      {isTablePassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#161512] border border-[#B68A2D]/50 shadow-[0_0_60px_rgba(182,138,45,0.35)] p-6 font-mono text-[#F3EFE6] space-y-4">
            <div className="corner-bracket-tl !w-4 !h-4 !border-[#B68A2D]" />
            <div className="corner-bracket-tr !w-4 !h-4 !border-[#B68A2D]" />
            <div className="corner-bracket-bl !w-4 !h-4 !border-[#B68A2D]" />
            <div className="corner-bracket-br !w-4 !h-4 !border-[#B68A2D]" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#B68A2D]/30 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#E5C378]" />
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-white uppercase">
                    DIGITAL TABLE PASS
                  </h3>
                  <span className="text-[10px] text-[#B68A2D] tracking-widest block">
                    SESSION NODE // T-VIP-01
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTablePassOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#211F1A] border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:border-[#B68A2D] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Graphic and Instructions */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#0E0D0B] border border-neutral-800 space-y-3">
              <div className="p-3 rounded-xl bg-white/95 shadow-inner flex items-center justify-center">
                <svg className="w-36 h-36 text-[#12110D]" viewBox="0 0 100 100" fill="currentColor">
                  {/* Position detection patterns */}
                  <rect x="5" y="5" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="13" y="13" width="14" height="14" rx="2" />
                  <rect x="65" y="5" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="73" y="13" width="14" height="14" rx="2" />
                  <rect x="5" y="65" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="13" y="73" width="14" height="14" rx="2" />
                  {/* Data matrix nodes */}
                  <rect x="42" y="8" width="6" height="6" />
                  <rect x="52" y="14" width="6" height="6" />
                  <rect x="42" y="24" width="6" height="6" />
                  <rect x="10" y="44" width="6" height="6" />
                  <rect x="22" y="44" width="6" height="6" />
                  <rect x="34" y="44" width="6" height="6" />
                  <rect x="46" y="44" width="8" height="8" />
                  <rect x="60" y="44" width="6" height="6" />
                  <rect x="74" y="44" width="6" height="6" />
                  <rect x="86" y="44" width="6" height="6" />
                  <rect x="42" y="60" width="6" height="6" />
                  <rect x="54" y="66" width="6" height="6" />
                  <rect x="68" y="60" width="6" height="6" />
                  <rect x="80" y="68" width="6" height="6" />
                  <rect x="42" y="78" width="6" height="6" />
                  <rect x="58" y="82" width="6" height="6" />
                  <rect x="72" y="80" width="6" height="6" />
                  <rect x="84" y="84" width="6" height="6" />
                </svg>
              </div>

              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-white tracking-wide block">
                  Scan to Join Table Session
                </span>
                <p className="text-[10px] text-neutral-400 max-w-xs">
                  Companions can scan to co-order dishes, browse the wine cellar, and view order telemetry.
                </p>
              </div>
            </div>

            {/* Table Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-[#211F1A] border border-[#B68A2D]/20">
              <div>
                <span className="text-[9px] text-[#B68A2D]/70 uppercase block">LOCATION</span>
                <span className="font-bold text-white">Table VIP-01 (Main Salon)</span>
              </div>
              <div>
                <span className="text-[9px] text-[#B68A2D]/70 uppercase block">STATUS</span>
                <span className="font-bold text-emerald-400">ACTIVE SESSION</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyTableLink}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#12110D] font-mono text-xs font-bold hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(182,138,45,0.3)]"
              >
                {isPassLinkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-900" />
                    <span>LINK COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY TABLE LINK</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsTablePassOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-[#211F1A] border border-neutral-700 text-neutral-300 font-mono text-xs hover:border-[#B68A2D] hover:text-white transition cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
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
