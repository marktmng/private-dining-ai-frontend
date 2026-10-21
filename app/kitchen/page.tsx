"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TacticalHeader from "@/components/TacticalHeader";
import TacticalLoginModal from "@/components/LoginModal";
import TacticalTicker from "@/components/TacticalTicker";
import { getMe, getOrders, updateOrderStatus } from "@/lib/api";
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
} from "lucide-react";

const TOKEN_STORAGE_KEY = "aivora_auth_token";

type TabFilter = "ALL" | "INCOMING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

export default function KitchenPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant A");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [orders, setOrders] = useState<PersistedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

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

  // 2. Fetch orders for current authenticated restaurant
  const fetchOrders = useCallback(
    async (token: string, silent = false) => {
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
    if (!authToken) return;
    queueMicrotask(() => {
      void fetchOrders(authToken);
    });

    // Auto-refresh orders every 4 seconds
    const interval = setInterval(() => {
      void fetchOrders(authToken, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [authToken, fetchOrders]);

  const handleLoginSuccess = useCallback(
    (token: string, user: AuthUser) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAuthToken(token);
      setCurrentUser(user);
      if (user.restaurantName) {
        setRestaurantName(user.restaurantName);
      }
      void fetchOrders(token);
    },
    [fetchOrders]
  );

  const handleSignOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setOrders([]);
  }, []);

  // Kitchen State Transition Actions
  const handleAcceptAndPrepare = async (order: PersistedOrder) => {
    if (!authToken || actionInProgressId) return;
    setActionInProgressId(order.id);
    setError(null);

    try {
      if (order.status === "PENDING") {
        await updateOrderStatus(order.id, "CONFIRMED", authToken);
        await updateOrderStatus(order.id, "SENT_TO_KITCHEN", authToken);
      } else if (order.status === "CONFIRMED") {
        await updateOrderStatus(order.id, "SENT_TO_KITCHEN", authToken);
      }

      await updateOrderStatus(order.id, "PREPARING", authToken);
      await fetchOrders(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to transition order status.";
      setError(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkReady = async (order: PersistedOrder) => {
    if (!authToken || actionInProgressId) return;
    setActionInProgressId(order.id);
    setError(null);

    try {
      await updateOrderStatus(order.id, "READY", authToken);
      await fetchOrders(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark order ready.";
      setError(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkCompleted = async (order: PersistedOrder) => {
    if (!authToken || actionInProgressId) return;
    setActionInProgressId(order.id);
    setError(null);

    try {
      await updateOrderStatus(order.id, "COMPLETED", authToken);
      await fetchOrders(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete order.";
      setError(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenRejectModal = (order: PersistedOrder) => {
    setRejectModalOrder(order);
    setRejectReason("Item unavailable / out of stock");
  };

  const handleConfirmReject = async () => {
    if (!authToken || !rejectModalOrder || isRejecting) return;
    setIsRejecting(true);

    try {
      await updateOrderStatus(
        rejectModalOrder.id,
        "CANCELLED",
        authToken,
        rejectReason.trim() || "Rejected by kitchen staff"
      );
      setRejectModalOrder(null);
      setRejectReason("");
      await fetchOrders(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject order.";
      setError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  // Filter orders by selected Tab
  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case "INCOMING":
        return orders.filter(
          (o) => o.status === "SENT_TO_KITCHEN" || o.status === "PENDING" || o.status === "CONFIRMED"
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
        (o) => o.status === "SENT_TO_KITCHEN" || o.status === "PENDING" || o.status === "CONFIRMED"
      ).length,
      preparing: orders.filter((o) => o.status === "PREPARING").length,
      ready: orders.filter((o) => o.status === "READY").length,
      completed: orders.filter((o) => o.status === "COMPLETED").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    };
  }, [orders]);

  return (
    <main className="min-h-screen bg-[#191814] text-[#F3EFE6] tactical-grid flex flex-col justify-between select-none">
      {/* Top Telemetry Header */}
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
                  LIVE STATION
                </span>
              </div>
              <p className="font-mono text-xs text-[#B68A2D]/80 mt-0.5">
                Executive Chef Terminal • Realtime order dispatch & table routing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => authToken && fetchOrders(authToken)}
              disabled={isLoading || !authToken}
              className="px-3.5 py-1.5 rounded-xl bg-[#211F1A] hover:bg-[#28251E] border border-[#B68A2D]/40 text-[#E5C378] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>SYNC KITCHEN</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span className="font-bold">LIVE TELEMETRY (4s)</span>
            </div>
          </div>
        </div>

        {/* Unauthenticated State */}
        {!authToken ? (
          <div className="corner-bracket-container rounded-2xl border border-[#B68A2D]/40 bg-[#1C1A15]/90 p-12 text-center space-y-4 shadow-2xl max-w-lg mx-auto">
            <div className="corner-bracket-tl !w-4 !h-4" />
            <div className="corner-bracket-tr !w-4 !h-4" />
            <div className="corner-bracket-bl !w-4 !h-4" />
            <div className="corner-bracket-br !w-4 !h-4" />

            <div className="w-16 h-16 rounded-full bg-[#25221B] border border-[#B68A2D] flex items-center justify-center mx-auto text-[#B68A2D] shadow-[0_0_20px_rgba(182,138,45,0.4)]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-[#F3EFE6]">
              Kitchen Authentication Required
            </h2>
            <p className="font-mono text-xs text-[#B68A2D]/80 leading-relaxed">
              Authenticate with Restaurant A staff credentials to receive live table orders and command the kitchen routing pipeline.
            </p>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="mt-2 px-6 py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#191814] shadow-[0_0_20px_rgba(182,138,45,0.4)] hover:opacity-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              Sign In as Chef / Kitchen Staff
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 font-mono text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Tactical KDS Status Filter Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[#B68A2D]/20 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("INCOMING")}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "INCOMING"
                    ? "bg-[#B68A2D] text-[#191814] shadow-[0_0_15px_rgba(182,138,45,0.45)]"
                    : "bg-[#211F1A] text-[#F3EFE6]/70 hover:text-white border border-[#B68A2D]/20"
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>INCOMING</span>
                {counts.incoming > 0 && (
                  <span className="bg-[#191814] text-[#E5C378] rounded-full px-2 py-0.2 text-[10px] font-extrabold animate-pulse">
                    {counts.incoming}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PREPARING")}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "PREPARING"
                    ? "bg-[#22D3EE] text-[#191814] shadow-[0_0_15px_rgba(34,211,238,0.45)]"
                    : "bg-[#211F1A] text-[#F3EFE6]/70 hover:text-white border border-[#B68A2D]/20"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>PREPARING</span>
                {counts.preparing > 0 && (
                  <span className="bg-[#191814] text-[#22D3EE] rounded-full px-2 py-0.2 text-[10px] font-extrabold">
                    {counts.preparing}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("READY")}
                className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "READY"
                    ? "bg-[#10B981] text-[#191814] shadow-[0_0_15px_rgba(16,185,129,0.45)]"
                    : "bg-[#211F1A] text-[#F3EFE6]/70 hover:text-white border border-[#B68A2D]/20"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>READY</span>
                {counts.ready > 0 && (
                  <span className="bg-[#191814] text-[#10B981] rounded-full px-2 py-0.2 text-[10px] font-extrabold">
                    {counts.ready}
                  </span>
                )}
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
                POLLING KITCHEN QUEUE...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="corner-bracket-container rounded-2xl border border-[#B68A2D]/25 bg-[#1C1A15]/80 p-12 text-center space-y-3">
                <div className="corner-bracket-tl !w-3.5 !h-3.5" />
                <div className="corner-bracket-tr !w-3.5 !h-3.5" />
                <div className="corner-bracket-bl !w-3.5 !h-3.5" />
                <div className="corner-bracket-br !w-3.5 !h-3.5" />

                <Utensils className="w-8 h-8 text-[#B68A2D]/40 mx-auto" />
                <h3 className="font-mono text-base font-bold text-[#F3EFE6] uppercase">
                  Station Clear // No Orders in this Queue
                </h3>
                <p className="font-mono text-xs text-[#B68A2D]/70 max-w-md mx-auto">
                  {activeTab === "INCOMING"
                    ? "Customer orders placed via voice or menu will materialize here instantaneously."
                    : `No active tickets match the ${activeTab} queue filter.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const isIncoming =
                    order.status === "SENT_TO_KITCHEN" ||
                    order.status === "PENDING" ||
                    order.status === "CONFIRMED";
                  const isPreparing = order.status === "PREPARING";
                  const isReady = order.status === "READY";
                  const isDone = order.status === "COMPLETED";
                  const isCancelled = order.status === "CANCELLED";

                  const isBusy = actionInProgressId === order.id;

                  return (
                    <div
                      key={order.id}
                      className="corner-bracket-container rounded-2xl bg-[#1C1A15] border border-[#B68A2D]/30 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-[#B68A2D]/60 transition-all"
                    >
                      <div className="corner-bracket-tl !w-3 !h-3" />
                      <div className="corner-bracket-tr !w-3 !h-3" />
                      <div className="corner-bracket-bl !w-3 !h-3" />
                      <div className="corner-bracket-br !w-3 !h-3" />

                      {/* Header of Order Card */}
                      <div className="flex items-start justify-between pb-3 border-b border-[#B68A2D]/20">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#E5C378]">
                              TICKET #{order.id.slice(0, 8)}
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#B68A2D]/20 text-[#B68A2D] border border-[#B68A2D]/40 font-bold">
                              VIP SUITE 01
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[#F3EFE6]/50 block mt-0.5">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Status Capsule */}
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

                      {/* Order Items List */}
                      <div className="space-y-2 flex-1">
                        {order.items.map((it) => (
                          <div
                            key={it.id}
                            className="p-2 rounded-lg bg-[#211F1A]/90 border border-[#B68A2D]/15 flex items-start justify-between text-xs font-mono"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#E5C378] bg-[#B68A2D]/20 px-1.5 py-0.2 rounded border border-[#B68A2D]/30">
                                  {it.quantity}x
                                </span>
                                <span className="font-medium text-[#F3EFE6]">
                                  {it.menuItem?.name || "Dish"}
                                </span>
                              </div>
                              {it.notes && (
                                <p className="text-[10px] text-[#B68A2D] mt-1 pl-6">
                                  NOTE: {it.notes}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-[#E5C378]">
                              ${Number(it.subtotal).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Special Chef Instructions */}
                      {order.specialInstructions && (
                        <div className="p-2.5 rounded-lg bg-[#25221B] border border-[#B68A2D]/30 font-mono text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B68A2D] block">
                            Special Instructions:
                          </span>
                          <p className="text-[#F3EFE6]/90 mt-0.5">{order.specialInstructions}</p>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#B68A2D]/20 font-mono text-xs font-bold">
                        <span className="text-[#F3EFE6]/60 uppercase">Ticket Total</span>
                        <span className="text-base text-[#E5C378]">
                          ${Number(order.total).toFixed(2)}
                        </span>
                      </div>

                      {/* Action Buttons based on status */}
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
                            <span>{isBusy ? "UPDATING..." : "MARK READY FOR SERVICE"}</span>
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

      {/* Bottom Telemetry Ticker */}
      <TacticalTicker />
    </main>
  );
}
