"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import LoginModal from "@/components/LoginModal";
import { getMe, getOrders, updateOrderStatus } from "@/lib/api";
import type { AuthUser, PersistedOrder } from "@/types/order";

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
      // Step through intermediate transitions safely if needed
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
    <main className="min-h-screen bg-slate-950 text-white flex justify-center">
      <div className="w-full max-w-6xl p-6 sm:p-8 space-y-8">
        <Header
          user={currentUser}
          restaurantName={restaurantName}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onSignOut={handleSignOut}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>🍳</span>
              <span>Kitchen Display System (KDS)</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live chef station • Real-time order fulfillment & kitchen routing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => authToken && fetchOrders(authToken)}
              disabled={isLoading || !authToken}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Updates (4s)</span>
            </span>
          </div>
        </div>

        {/* Unauthenticated Guard */}
        {!authToken ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 shadow-xl">
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-bold text-white">Kitchen Authentication Required</h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              Please sign in with Restaurant A credentials to view and manage live incoming food and drink orders.
            </p>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
            >
              Sign In as Chef / Staff
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {error ? (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs text-red-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Kitchen Status Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("INCOMING")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "INCOMING"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <span>🔔 Incoming</span>
                {counts.incoming > 0 ? (
                  <span className="bg-amber-500 text-slate-950 rounded-full px-2 py-0.2 text-[10px] font-extrabold animate-pulse">
                    {counts.incoming}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PREPARING")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "PREPARING"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <span>🔥 Preparing</span>
                {counts.preparing > 0 ? (
                  <span className="bg-blue-500 text-white rounded-full px-2 py-0.2 text-[10px] font-bold">
                    {counts.preparing}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("READY")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === "READY"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <span>✅ Ready</span>
                {counts.ready > 0 ? (
                  <span className="bg-emerald-500 text-slate-950 rounded-full px-2 py-0.2 text-[10px] font-bold">
                    {counts.ready}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("COMPLETED")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "COMPLETED"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                ✓ Completed ({counts.completed})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CANCELLED")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "CANCELLED"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                ✕ Cancelled / Rejected ({counts.cancelled})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "ALL"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                All Orders ({orders.length})
              </button>
            </div>

            {/* Orders Grid */}
            {isLoading && orders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading kitchen orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center space-y-3">
                <div className="text-3xl">☕</div>
                <h3 className="text-lg font-bold text-white">No Orders in this Section</h3>
                <p className="text-xs text-slate-400">
                  {activeTab === "INCOMING"
                    ? "Kitchen display is clear. New voice orders placed by customers will appear here automatically."
                    : `No orders currently match the ${activeTab} filter.`}
                </p>
                <Link
                  href="/customer"
                  className="inline-block mt-2 text-xs text-blue-400 hover:underline"
                >
                  Place a test voice order →
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => {
                  const isIncoming =
                    order.status === "SENT_TO_KITCHEN" ||
                    order.status === "CONFIRMED" ||
                    order.status === "PENDING";
                  const isPreparing = order.status === "PREPARING";
                  const isReady = order.status === "READY";
                  const isActionLoading = actionInProgressId === order.id;

                  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all ${
                        isIncoming
                          ? "bg-slate-900/90 border-amber-500/40 ring-1 ring-amber-500/20"
                          : isPreparing
                          ? "bg-slate-900/90 border-blue-500/40"
                          : isReady
                          ? "bg-slate-900/90 border-emerald-500/40"
                          : "bg-slate-900/50 border-slate-800 opacity-80"
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Order Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-base text-white">
                                #{order.id.slice(0, 8)}
                              </span>
                              {order.table?.name ? (
                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                                  Table {order.table.name}
                                </span>
                              ) : order.room?.name ? (
                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                                  Room {order.room.name}
                                </span>
                              ) : (
                                <span className="text-[11px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-full">
                                  Dine-In
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Ordered at {formattedTime}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                              isIncoming
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                                : isPreparing
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                : isReady
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : order.status === "COMPLETED"
                                ? "bg-slate-800 text-slate-300 border-slate-700"
                                : "bg-red-500/20 text-red-300 border-red-500/40"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2.5">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800/80 text-sm flex items-start justify-between"
                            >
                              <div>
                                <p className="font-bold text-white">
                                  <span className="text-amber-400 font-extrabold text-base mr-2">
                                    {item.quantity}x
                                  </span>
                                  {item.menuItem?.name || "Item"}
                                </p>
                                {item.notes ? (
                                  <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                                    Note: {item.notes}
                                  </p>
                                ) : null}
                              </div>
                              <span className="text-xs text-slate-400">
                                ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Special Instructions or Rejection Note */}
                        {order.specialInstructions ? (
                          <div className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800 text-xs text-slate-300">
                            <span className="font-bold text-slate-200">Notes:</span>{" "}
                            {order.specialInstructions}
                          </div>
                        ) : null}
                      </div>

                      {/* Footer & Actions */}
                      <div className="pt-3 border-t border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Server Total</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            ${Number(order.total).toFixed(2)}
                          </span>
                        </div>

                        {/* Action Buttons with State Transitions */}
                        {isIncoming ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptAndPrepare(order)}
                              disabled={isActionLoading}
                              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isActionLoading ? "..." : "🔥 Accept & Cook"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(order)}
                              disabled={isActionLoading}
                              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-red-950/80 text-red-300 border border-red-900/40 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : isPreparing ? (
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkReady(order)}
                              disabled={isActionLoading}
                              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isActionLoading ? "..." : "✅ Mark Ready for Service"}
                            </button>
                          </div>
                        ) : isReady ? (
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkCompleted(order)}
                              disabled={isActionLoading}
                              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isActionLoading ? "..." : "✓ Mark Served / Completed"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rejection Modal with Reason Input */}
      {rejectModalOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚠️ Reject Order #{rejectModalOrder.id.slice(0, 8)}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Please provide a reason for rejecting this order. The customer and manager will see this note.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-xl bg-slate-800 border border-slate-700 p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="e.g. Wagyu Ribeye out of stock, kitchen unable to prepare..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg disabled:opacity-50"
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </main>
  );
}
