"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TacticalHeader from "@/components/TacticalHeader";
import TacticalLoginModal from "@/components/LoginModal";
import TacticalTicker from "@/components/TacticalTicker";
import { getMe, getOrders, updateOrderStatus, fireCourse, holdCourse } from "@/lib/api";
import { API_URL } from "@/lib/constants";
import type { AuthUser, PersistedOrder } from "@/types/order";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Flame,
  BellRing,
  XCircle,
  Utensils,
  ShieldAlert,
  Sparkles,
  Radio,
  PauseCircle,
  PlayCircle,
  MapPin,
} from "lucide-react";

const TOKEN_STORAGE_KEY = "aivora_auth_token";

type TabFilter = "ALL" | "INCOMING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

function playKitchenChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

export default function KitchenPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant A");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [orders, setOrders] = useState<PersistedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  const [activeTab, setActiveTab] = useState<TabFilter>("INCOMING");

  // Rejection modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<PersistedOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // 1. Check existing saved token on mount
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
        const msg = err instanceof Error ? err.message : "Session expired";
        console.warn("Kitchen: Stored token is invalid:", msg);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
      });
  }, []);

  // 2. Fetch initial orders
  const fetchOrders = useCallback(
    async (token?: string, silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await getOrders(token);
        setOrders(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load kitchen orders.";
        if (!silent) setError(msg);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchOrders(authToken ?? undefined);
  }, [authToken, fetchOrders]);

  // 3. Real-time Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!authToken) return;

    const sseUrl = `${API_URL}/kds/events?token=${encodeURIComponent(authToken)}`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.addEventListener("order:new", (e) => {
        try {
          const data = JSON.parse(e.data);
          playKitchenChime();
          setOrders((prev) => {
            if (prev.some((o) => o.id === data.order.id)) return prev;
            return [data.order, ...prev];
          });
        } catch {}
      });

      eventSource.addEventListener("order:updated", (e) => {
        try {
          const data = JSON.parse(e.data);
          setOrders((prev) =>
            prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o))
          );
        } catch {}
      });

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.order) {
            setOrders((prev) => {
              const exists = prev.some((o) => o.id === data.order.id);
              if (exists) {
                return prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o));
              } else {
                playKitchenChime();
                return [data.order, ...prev];
              }
            });
          }
        } catch {}
      };

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [authToken]);

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    setAuthToken(token);
    setCurrentUser(user);
    if (user.restaurantName) {
      setRestaurantName(user.restaurantName);
    }
    fetchOrders(token);
  };

  const handleSignOut = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setRestaurantName("Restaurant A");
    fetchOrders();
  };

  const handleAcceptAndPrepare = async (order: PersistedOrder) => {
    setActionInProgressId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, "PREPARING", authToken ?? undefined);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      setError(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkReady = async (order: PersistedOrder) => {
    setActionInProgressId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, "READY", authToken ?? undefined);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      setError(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkCompleted = async (order: PersistedOrder) => {
    setActionInProgressId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, "COMPLETED", authToken ?? undefined);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete order.";
      setError(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleHoldCourse = async (orderId: string, course: string) => {
    if (!authToken) return;
    try {
      await holdCourse(authToken, orderId, course);
      fetchOrders(authToken, true);
    } catch {}
  };

  const handleFireCourse = async (orderId: string, course: string) => {
    if (!authToken) return;
    try {
      await fireCourse(authToken, orderId, course);
      playKitchenChime();
      fetchOrders(authToken, true);
    } catch {}
  };

  const handleOpenRejectModal = (order: PersistedOrder) => {
    setRejectModalOrder(order);
    setRejectReason("Kitchen unable to fulfill ingredients");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    setIsRejecting(true);
    try {
      const updated = await updateOrderStatus(
        rejectModalOrder.id,
        "CANCELLED",
        authToken ?? undefined,
        rejectReason
      );
      setOrders((prev) => prev.map((o) => (o.id === rejectModalOrder.id ? updated : o)));
      setRejectModalOrder(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject order.";
      setError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case "INCOMING":
        return orders.filter(
          (o) =>
            o.status === "SENT_TO_KITCHEN" ||
            o.status === "PENDING" ||
            o.status === "ACCEPTED" ||
            o.status === "CONFIRMED"
        );
      case "PREPARING":
        return orders.filter((o) => o.status === "PREPARING");
      case "READY":
        return orders.filter((o) => o.status === "READY");
      case "COMPLETED":
        return orders.filter((o) => o.status === "COMPLETED");
      case "CANCELLED":
        return orders.filter((o) => o.status === "CANCELLED");
      case "ALL":
      default:
        return orders;
    }
  }, [orders, activeTab]);

  const counts = useMemo(() => {
    return {
      incoming: orders.filter(
        (o) =>
          o.status === "SENT_TO_KITCHEN" ||
          o.status === "PENDING" ||
          o.status === "ACCEPTED" ||
          o.status === "CONFIRMED"
      ).length,
      preparing: orders.filter((o) => o.status === "PREPARING").length,
      ready: orders.filter((o) => o.status === "READY").length,
      completed: orders.filter((o) => o.status === "COMPLETED").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    };
  }, [orders]);

  return (
    <main className="min-h-screen bg-[#191814] text-[#F3EFE6] tactical-grid flex flex-col justify-between select-none">
      <TacticalHeader
        user={currentUser}
        restaurantName={restaurantName}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        menuItemCount={orders.length}
        currentPath="/kitchen"
      />

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* KDS Banner Header */}
        <div className="corner-bracket-container bg-[#1C1A15]/90 border border-[#B68A2D]/30 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="corner-bracket-tl !w-3 !h-3" />
          <div className="corner-bracket-tr !w-3 !h-3" />
          <div className="corner-bracket-bl !w-3 !h-3" />
          <div className="corner-bracket-br !w-3 !h-3" />

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#28251E] border border-[#B68A2D] flex items-center justify-center shadow-[0_0_15px_rgba(182,138,45,0.3)]">
              <ChefHat className="w-6 h-6 text-[#E5C378]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg sm:text-2xl font-extrabold tracking-widest uppercase text-[#F3EFE6]">
                  Kitchen Display System (KDS)
                </h1>
                <span className="font-mono text-[10px] bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 px-2 py-0.5 rounded">
                  {sseConnected ? "SSE LIVE STREAM" : "ONLINE STATION"}
                </span>
              </div>
              <p className="font-mono text-xs text-[#B68A2D]/80 mt-0.5">
                Executive Chef Terminal • Real-time dispatch, table/room routing & course pacing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => fetchOrders(authToken ?? undefined)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-[#211F1A] hover:bg-[#28251E] border border-[#B68A2D]/40 text-[#E5C378] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>SYNC KITCHEN</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span className="font-bold">{sseConnected ? "REAL-TIME SSE" : "CONNECTED"}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 font-mono text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs border-b border-[#B68A2D]/20 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("INCOMING")}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === "INCOMING"
                ? "bg-[#F59E0B] text-[#191814] shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            🔥 INCOMING ({counts.incoming})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PREPARING")}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === "PREPARING"
                ? "bg-[#22D3EE] text-[#191814] shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            👨‍🍳 PREPARING ({counts.preparing})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("READY")}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === "READY"
                ? "bg-[#10B981] text-[#191814] shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            🔔 READY FOR PASS ({counts.ready})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === "COMPLETED"
                ? "bg-[#2A261E] text-[#E5C378] border border-[#B68A2D]"
                : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            ✓ COMPLETED ({counts.completed})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CANCELLED")}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === "CANCELLED"
                ? "bg-red-950/60 text-red-300 border border-red-500/50"
                : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            ✕ CANCELLED ({counts.cancelled})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-[#2A261E] text-[#E5C378] border border-[#B68A2D]"
                : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            ALL ({orders.length})
          </button>
        </div>

        {/* Orders Grid */}
        {isLoading && orders.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[#B68A2D] animate-pulse">
            CONNECTING TO KITCHEN QUEUE...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="corner-bracket-container rounded-2xl border border-[#B68A2D]/25 bg-[#1C1A15]/80 p-12 text-center space-y-3">
            <Utensils className="w-8 h-8 text-[#B68A2D]/40 mx-auto" />
            <h3 className="font-mono text-base font-bold text-[#F3EFE6] uppercase">
              Station Clear // No Orders in this Queue
            </h3>
            <p className="font-mono text-xs text-[#B68A2D]/70 max-w-md mx-auto">
              {activeTab === "INCOMING"
                ? "Customer orders placed via QR, Kiosk, or voice will materialize here instantaneously."
                : `No active tickets match the ${activeTab} queue filter.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const isIncoming =
                order.status === "SENT_TO_KITCHEN" ||
                order.status === "PENDING" ||
                order.status === "ACCEPTED" ||
                order.status === "CONFIRMED";
              const isPreparing = order.status === "PREPARING";
              const isReady = order.status === "READY";
              const isDone = order.status === "COMPLETED";
              const isCancelled = order.status === "CANCELLED";

              const isBusy = actionInProgressId === order.id;

              // Location formatting
              const locationLabel =
                order.location?.name ||
                order.table?.name ||
                order.room?.name ||
                (order.fulfillmentMethod === "COUNTER_PICKUP" ? "Counter Pickup" : "Direct Order");

              return (
                <div
                  key={order.id}
                  className="corner-bracket-container rounded-2xl bg-[#1C1A15] border border-[#B68A2D]/30 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-[#B68A2D]/60 transition-all"
                >
                  <div className="corner-bracket-tl !w-3 !h-3" />
                  <div className="corner-bracket-tr !w-3 !h-3" />
                  <div className="corner-bracket-bl !w-3 !h-3" />
                  <div className="corner-bracket-br !w-3 !h-3" />

                  {/* Card Header: Ticket & Location */}
                  <div className="flex items-start justify-between pb-3 border-b border-[#B68A2D]/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#E5C378]">
                          TICKET #{order.orderNumber || order.id.slice(0, 6)}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#B68A2D]/20 text-[#B68A2D] border border-[#B68A2D]/40 font-bold uppercase">
                          {locationLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-[#F3EFE6]/50">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {order.orderChannel && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            {order.orderChannel}
                          </span>
                        )}
                        {order.fulfillmentMethod && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            {order.fulfillmentMethod.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isIncoming
                          ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 animate-pulse"
                          : isPreparing
                          ? "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/40"
                          : isReady
                          ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40"
                          : isDone
                          ? "bg-[#211F1A] text-[#F3EFE6]/60 border-[#B68A2D]/20"
                          : "bg-red-950/40 text-red-400 border-red-500/40"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Items List with Modifiers and Course Pacing */}
                  <div className="space-y-2 flex-1">
                    {order.items.map((it) => (
                      <div
                        key={it.id}
                        className="p-2.5 rounded-lg bg-[#211F1A]/90 border border-[#B68A2D]/15 text-xs font-mono space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#E5C378] bg-[#B68A2D]/20 px-1.5 py-0.2 rounded border border-[#B68A2D]/30">
                              {it.quantity}x
                            </span>
                            <span className="font-medium text-[#F3EFE6]">
                              {it.menuItem?.name || "Dish Item"}
                            </span>
                          </div>
                          <span className="font-bold text-[#E5C378]">
                            ${Number(it.subtotal).toFixed(2)}
                          </span>
                        </div>

                        {/* Modifiers List */}
                        {it.modifiers && it.modifiers.length > 0 && (
                          <div className="pl-6 text-[10px] text-amber-200/80 space-y-0.5">
                            {it.modifiers.map((m) => (
                              <div key={m.id}>• {m.name}</div>
                            ))}
                          </div>
                        )}

                        {it.notes && (
                          <p className="text-[10px] text-[#B68A2D] pl-6 italic">
                            NOTE: {it.notes}
                          </p>
                        )}

                        {/* Kitchen Course Pacing Controls (Starters / Mains / Desserts) */}
                        {it.course && (
                          <div className="pt-1 flex items-center justify-between text-[10px] border-t border-[#B68A2D]/10">
                            <span className="font-bold text-neutral-400 uppercase">
                              COURSE: {it.course} ({it.courseStatus || "FIRED"})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleHoldCourse(order.id, it.course!)}
                                className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700"
                              >
                                HOLD
                              </button>
                              <button
                                onClick={() => handleFireCourse(order.id, it.course!)}
                                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded border border-amber-500/40 font-bold"
                              >
                                FIRE 🔥
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="p-2.5 rounded-lg bg-[#25221B] border border-[#B68A2D]/30 font-mono text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#B68A2D] block">
                        Special Instructions:
                      </span>
                      <p className="text-[#F3EFE6]/90 mt-0.5">{order.specialInstructions}</p>
                    </div>
                  )}

                  {/* Card Total */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#B68A2D]/20 font-mono text-xs font-bold">
                    <span className="text-[#F3EFE6]/60 uppercase">Ticket Total</span>
                    <span className="text-base text-[#E5C378]">
                      ${Number(order.total).toFixed(2)}
                    </span>
                  </div>

                  {/* Status Transition Action Buttons */}
                  <div className="pt-2">
                    {isIncoming && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptAndPrepare(order)}
                          disabled={isBusy}
                          className="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#191814] shadow-[0_0_15px_rgba(182,138,45,0.4)] hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>{isBusy ? "COOKING..." : "ACCEPT & COOK"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(order)}
                          disabled={isBusy}
                          className="px-3 rounded-xl font-mono text-xs font-bold bg-[#211F1A] border border-red-500/40 text-red-400 hover:bg-red-950/40 transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {isPreparing && (
                      <button
                        type="button"
                        onClick={() => handleMarkReady(order)}
                        disabled={isBusy}
                        className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#10B981] to-[#34D399] text-[#191814] shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isBusy ? "UPDATING..." : "MARK READY FOR PASS"}</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        type="button"
                        onClick={() => handleMarkCompleted(order)}
                        disabled={isBusy}
                        className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-[#211F1A] border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-[#191814] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>{isBusy ? "COMPLETING..." : "SERVE & COMPLETE"}</span>
                      </button>
                    )}

                    {isDone && (
                      <div className="text-center font-mono text-xs text-[#10B981] py-1">
                        ✓ FULFILLED
                      </div>
                    )}

                    {isCancelled && (
                      <div className="text-center font-mono text-xs text-red-400 py-1">
                        ✕ TICKET CANCELLED
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="corner-bracket-container w-full max-w-md rounded-2xl bg-[#1C1A15] border border-red-500/40 p-6 space-y-4 shadow-2xl text-[#F3EFE6] font-mono">
            <div className="corner-bracket-tl !w-3 !h-3 !border-red-500" />
            <div className="corner-bracket-tr !w-3 !h-3 !border-red-500" />
            <div className="corner-bracket-bl !w-3 !h-3 !border-red-500" />
            <div className="corner-bracket-br !w-3 !h-3 !border-red-500" />

            <div className="flex items-center gap-2 text-red-400 border-b border-red-500/30 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase tracking-wider">
                Reject Ticket #{rejectModalOrder.id.slice(0, 8)}
              </h3>
            </div>

            <div>
              <label className="block text-xs text-[#B68A2D] mb-1">
                Reason for Kitchen Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl bg-[#191814] border border-[#B68A2D]/30 text-[#F3EFE6] focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="flex-1 py-2 rounded-xl bg-[#211F1A] border border-[#B68A2D]/30 text-xs font-bold text-[#F3EFE6]/80"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isRejecting ? "REJECTING..." : "CONFIRM REJECT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Login Modal */}
      <TacticalLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <TacticalTicker />
    </main>
  );
}
