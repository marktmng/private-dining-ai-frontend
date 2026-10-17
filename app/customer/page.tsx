"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Conversation from "@/components/Conversation";
import Header from "@/components/Header";
import LoginModal from "@/components/LoginModal";
import MenuItem from "@/components/MenuItem";
import OrderSummary from "@/components/OrderSummary";
import StatusCard from "@/components/StatusCard";
import VoiceButton from "@/components/VoiceButton";

import { getMe, getMenu, getOrderById, submitOrder, updateOrderStatus } from "@/lib/api";
import { matchOrderFromTranscript } from "@/lib/orderMatcher";
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

  const [conversation, setConversation] = useState<TranscriptEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [menu, setMenu] = useState<MenuItemType[]>([]);
  const [menuError, setMenuError] = useState("");
  const [status, setStatus] = useState("Waiting for customer...");

  // Order submission and persistence state
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitOrderError, setSubmitOrderError] = useState<string | null>(null);
  const [persistedOrder, setPersistedOrder] = useState<PersistedOrder | null>(null);

  const sessionRef = useRef<RealtimeVoiceSession | null>(null);

  // 1. Check existing saved token on client mount
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
        setMenuError("");
        const items = await getMenu(authToken ?? undefined);
        if (!isCancelled) {
          setMenu(items);
          setMenuError("");
        }
      } catch (error) {
        console.error(error);
        if (!isCancelled) {
          setMenuError("Menu is unavailable right now.");
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
    setStatus(`Connected to ${user.restaurantName || "Restaurant A"}`);
  }, []);

  // Handle logout (switch to unauthenticated prototype)
  const handleSignOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setPersistedOrder(null);
    setConversation([]);
    setStatus("Switched to prototype mode.");
  }, []);

  const groupedMenu = useMemo(() => {
    return menu.reduce<Record<string, MenuItemType[]>>((groups, item) => {
      const category = item.category ?? "Menu";
      groups[category] = [...(groups[category] ?? []), item];
      return groups;
    }, {});
  }, [menu]);

  const currentOrder = useMemo(() => {
    return conversation
      .filter((entry) => entry.role === "user" && entry.isFinal)
      .map((entry) => entry.text.trim())
      .filter(Boolean)
      .join("\n");
  }, [conversation]);

  const orderMatch = useMemo(() => {
    return matchOrderFromTranscript(currentOrder, menu);
  }, [currentOrder, menu]);

  const displayStatus =
    orderMatch.needsConfirmation.length > 0
      ? "Please confirm the highlighted menu item."
      : orderMatch.spokenTotal || status;

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
    setStatus("Voice session ended.");
  }, []);

  const startListening = useCallback(async () => {
    // If there was an earlier persisted order, clear it for new order
    if (persistedOrder) {
      setPersistedOrder(null);
    }

    setConversation([]);
    setIsConnecting(true);
    setStatus("Requesting microphone...");

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
          : "Unable to start voice session."
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

  // Order Submission Handler
  const handleSubmitConfirmedOrder = useCallback(async () => {
    if (!authToken) {
      setSubmitOrderError("Please sign in as Restaurant A to submit orders to the database.");
      return;
    }

    if (orderMatch.items.length === 0) {
      setSubmitOrderError("No menu items to order.");
      return;
    }

    // Verify all items have database IDs
    const missingIds = orderMatch.items.filter((i) => !i.id);
    if (missingIds.length > 0) {
      setSubmitOrderError("Some items do not have valid database IDs.");
      return;
    }

    setIsSubmittingOrder(true);
    setSubmitOrderError(null);

    try {
      const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: CreateOrderPayload = {
        idempotencyKey,
        specialInstructions: specialInstructions.trim() || undefined,
        items: orderMatch.items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      };

      const created = await submitOrder(payload, authToken);

      // Transition to CONFIRMED, then SENT_TO_KITCHEN
      let finalOrder = created;
      try {
        await updateOrderStatus(created.id, "CONFIRMED", authToken);
        finalOrder = await updateOrderStatus(created.id, "SENT_TO_KITCHEN", authToken);
      } catch (transErr) {
        console.warn("Notice transitioning status to kitchen:", transErr);
      }

      setPersistedOrder(finalOrder);
      setStatus(
        `Order #${finalOrder.id.slice(0, 8)} confirmed and sent to kitchen! Total: $${Number(finalOrder.total).toFixed(2)}`
      );

      // Stop active voice session upon placement
      if (sessionRef.current) {
        stopListening();
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit order to the kitchen.";
      console.error("Order submission failed:", errorMsg);
      setSubmitOrderError(errorMsg);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [authToken, orderMatch.items, specialInstructions, stopListening]);

  const handleResetOrder = useCallback(() => {
    setPersistedOrder(null);
    setConversation([]);
    setSpecialInstructions("");
    setSubmitOrderError(null);
    setStatus("Ready for next order.");
  }, []);

  // Poll live order status until completed or cancelled
  useEffect(() => {
    if (!persistedOrder || !authToken) return;
    if (persistedOrder.status === "COMPLETED" || persistedOrder.status === "CANCELLED") return;

    const interval = setInterval(async () => {
      try {
        const latest = await getOrderById(persistedOrder.id, authToken);
        if (latest && latest.status !== persistedOrder.status) {
          setPersistedOrder(latest);
          if (latest.status === "PREPARING") {
            setStatus(`Order #${latest.id.slice(0, 8)} is now being prepared by the chef!`);
          } else if (latest.status === "READY") {
            setStatus(`Order #${latest.id.slice(0, 8)} is READY for service!`);
          } else if (latest.status === "COMPLETED") {
            setStatus(`Order #${latest.id.slice(0, 8)} has been completed!`);
          } else if (latest.status === "CANCELLED") {
            setStatus(
              `Order #${latest.id.slice(0, 8)} was cancelled: ${
                latest.specialInstructions || "No reason specified"
              }`
            );
          }
        }
      } catch (e) {
        console.warn("Status polling error:", e);
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
    <main className="min-h-screen bg-slate-950 text-white flex justify-center">
      <div className="w-full max-w-6xl p-6 sm:p-8 space-y-8">
        <Header
          user={currentUser}
          restaurantName={restaurantName}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onSignOut={handleSignOut}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-8">
            <VoiceButton
              disabled={isConnecting}
              isConnecting={isConnecting}
              isListening={isListening}
              isSpeaking={isSpeaking}
              onToggleListening={toggleListening}
            />

            <OrderSummary
              items={orderMatch.items}
              needsConfirmation={orderMatch.needsConfirmation}
              order={currentOrder}
              spokenTotal={orderMatch.spokenTotal}
              total={orderMatch.total}
              isAuthenticated={!!authToken}
              isSubmitting={isSubmittingOrder}
              submitError={submitOrderError}
              onSubmitOrder={handleSubmitConfirmedOrder}
              persistedOrder={persistedOrder}
              onResetOrder={handleResetOrder}
              specialInstructions={specialInstructions}
              onSpecialInstructionsChange={setSpecialInstructions}
            />

            <Conversation response={conversationText} />

            <StatusCard status={displayStatus} />
          </div>

          <aside className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {authToken ? "Active Database Menu" : "Prototype Menu"}
              </h2>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                {menu.length} items
              </span>
            </div>

            {menuError ? (
              <p className="text-red-400 text-sm">{menuError}</p>
            ) : menu.length === 0 ? (
              <p className="text-slate-400 text-sm">Loading menu...</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedMenu).map(([category, items]) => (
                  <section key={category}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                      {category}
                    </h3>

                    <div className="divide-y divide-slate-800/60">
                      {items.map((item) => (
                        <MenuItem key={item.id ?? item.name} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      <LoginModal
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
    return "I've updated the order list.";
  }

  return trimmed;
}
