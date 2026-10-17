"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import LoginModal from "@/components/LoginModal";
import {
  createMenuItem,
  deleteMenuItem,
  getFullMenus,
  getMe,
  getOrders,
  updateMenuItem,
  updateOrderStatus,
} from "@/lib/api";
import type {
  AuthUser,
  CreateMenuItemPayload,
  MenuItem,
  MenuWithItems,
  PersistedOrder,
} from "@/types/order";

const TOKEN_STORAGE_KEY = "aivora_auth_token";

type AdminTab = "ORDERS" | "MENU";
type StatusFilter = "ALL" | "INCOMING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
type TimeFilter = "ALL" | "TODAY" | "WEEK";

export default function AdminPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant A");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("ORDERS");

  // Orders State
  const [orders, setOrders] = useState<PersistedOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL");
  const [filterReferenceTime, setFilterReferenceTime] = useState<number>(0);

  // Selected Order for Modal Detail Inspection
  const [inspectedOrder, setInspectedOrder] = useState<PersistedOrder | null>(null);

  // Menu State
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Edit / Create Menu Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ menuId: string; item?: MenuItem } | null>(null);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormCategory, setItemFormCategory] = useState("Mains");
  const [itemFormPrice, setItemFormPrice] = useState("");
  const [itemFormDescription, setItemFormDescription] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemSaveError, setItemSaveError] = useState<string | null>(null);

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
        console.warn("Admin: Stored token is invalid:", msg);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
      });
  }, []);

  // 2. Fetch Orders for authenticated restaurant
  const fetchOrders = useCallback(async (token: string, silent = false) => {
    if (!silent) setIsOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await getOrders(token);
      setOrders(data);
      setFilterReferenceTime(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load orders.";
      if (!silent) setOrdersError(msg);
    } finally {
      if (!silent) setIsOrdersLoading(false);
    }
  }, []);

  // 3. Fetch Menus for authenticated restaurant
  const fetchMenus = useCallback(async (token: string, silent = false) => {
    if (!silent) setIsMenuLoading(true);
    setMenuError(null);
    try {
      const data = await getFullMenus(token);
      setMenus(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load menus.";
      if (!silent) setMenuError(msg);
    } finally {
      if (!silent) setIsMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authToken) return;
    queueMicrotask(() => {
      void fetchOrders(authToken);
      void fetchMenus(authToken);
    });

    // Auto-refresh orders every 5 seconds
    const interval = setInterval(() => {
      void fetchOrders(authToken, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [authToken, fetchOrders, fetchMenus]);

  const handleLoginSuccess = useCallback(
    (token: string, user: AuthUser) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAuthToken(token);
      setCurrentUser(user);
      if (user.restaurantName) {
        setRestaurantName(user.restaurantName);
      }
      void fetchOrders(token);
      void fetchMenus(token);
    },
    [fetchOrders, fetchMenus]
  );

  const handleSignOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setOrders([]);
    setMenus([]);
  }, []);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter === "INCOMING") {
        const isIncoming =
          order.status === "PENDING" ||
          order.status === "CONFIRMED" ||
          order.status === "SENT_TO_KITCHEN";
        if (!isIncoming) return false;
      } else if (statusFilter !== "ALL") {
        if (order.status !== statusFilter) return false;
      }

      // 2. Time Filter
      if (timeFilter !== "ALL" && filterReferenceTime > 0) {
        const orderDate = new Date(order.createdAt).getTime();
        if (timeFilter === "TODAY") {
          const startOfToday = new Date(filterReferenceTime);
          startOfToday.setHours(0, 0, 0, 0);
          if (orderDate < startOfToday.getTime()) return false;
        } else if (timeFilter === "WEEK") {
          const sevenDaysAgo = filterReferenceTime - 7 * 24 * 60 * 60 * 1000;
          if (orderDate < sevenDaysAgo) return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, timeFilter, filterReferenceTime]);

  // Operational metrics strictly computed from actual database records (No mock data)
  const operationalSummary = useMemo(() => {
    const totalCount = orders.length;
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const activeOrders = orders.filter(
      (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
    );
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

    // Total revenue from completed orders
    const totalCompletedRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );

    // Total gross volume across all non-cancelled orders
    const grossVolume = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total), 0);

    return {
      totalCount,
      completedCount: completedOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledOrders.length,
      totalCompletedRevenue,
      grossVolume,
    };
  }, [orders]);

  // Menu Item Actions
  const handleOpenAddItem = (menuId: string) => {
    setEditingItem({ menuId });
    setItemFormName("");
    setItemFormCategory("Mains");
    setItemFormPrice("");
    setItemFormDescription("");
    setItemSaveError(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (menuId: string, item: MenuItem) => {
    setEditingItem({ menuId, item });
    setItemFormName(item.name);
    setItemFormCategory(item.category || "Mains");
    setItemFormPrice(item.price.toString());
    setItemFormDescription(item.description || "");
    setItemSaveError(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!authToken || !editingItem) return;
    const priceNum = parseFloat(itemFormPrice);
    if (!itemFormName.trim() || isNaN(priceNum) || priceNum <= 0) {
      setItemSaveError("Please enter a valid item name and positive price.");
      return;
    }

    setIsSavingItem(true);
    setItemSaveError(null);

    try {
      const payload: CreateMenuItemPayload = {
        name: itemFormName.trim(),
        category: itemFormCategory.trim() || "Mains",
        price: priceNum,
        description: itemFormDescription.trim() || undefined,
        active: true,
      };

      if (editingItem.item?.id) {
        await updateMenuItem(
          editingItem.menuId,
          editingItem.item.id,
          payload,
          authToken
        );
      } else {
        await createMenuItem(editingItem.menuId, payload, authToken);
      }

      setIsItemModalOpen(false);
      await fetchMenus(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save menu item.";
      setItemSaveError(msg);
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleToggleItemActive = async (menuId: string, item: MenuItem) => {
    if (!authToken || !item.id) return;
    try {
      await updateMenuItem(
        menuId,
        item.id,
        { active: !item.active },
        authToken
      );
      await fetchMenus(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update item.";
      setMenuError(msg);
    }
  };

  const handleDeleteItem = async (menuId: string, itemId: string) => {
    if (!authToken) return;
    if (!confirm("Are you sure you want to delete this menu item?")) return;

    try {
      await deleteMenuItem(menuId, itemId, authToken);
      await fetchMenus(authToken, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete item.";
      setMenuError(msg);
    }
  };

  const handleAdminCancelOrder = async (orderId: string) => {
    if (!authToken) return;
    const reason = prompt("Enter cancellation reason for order:", "Cancelled by manager");
    if (!reason) return;

    try {
      await updateOrderStatus(orderId, "CANCELLED", authToken, reason);
      await fetchOrders(authToken, true);
      if (inspectedOrder?.id === orderId) {
        setInspectedOrder(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel order.";
      setOrdersError(msg);
    }
  };

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
              <span>📊</span>
              <span>Manager Operations Dashboard</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Authoritative order tracking, operational summaries, and menu management
            </p>
          </div>

          {authToken ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setActiveTab("ORDERS")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "ORDERS"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Orders & Operations
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MENU")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "MENU"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Menu & Pricing
              </button>
            </div>
          ) : null}
        </div>

        {/* Unauthenticated Guard */}
        {!authToken ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 shadow-xl">
            <div className="text-4xl">🔐</div>
            <h2 className="text-xl font-bold text-white">Manager Authentication Required</h2>
            <p className="text-slate-400 max-w-md mx-auto text-sm">
              Please sign in with Restaurant A credentials (Owner/Admin) to access operational metrics, order logs, and menu pricing.
            </p>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
            >
              Sign In to Manager Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Operational Summary Cards (Strictly Grounded in Actual DB Records) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Orders
                </span>
                <p className="text-3xl font-extrabold text-white">
                  {operationalSummary.totalCount}
                </p>
                <p className="text-[11px] text-slate-500">Live Supabase database records</p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Active in Kitchen
                </span>
                <p className="text-3xl font-extrabold text-amber-300">
                  {operationalSummary.activeCount}
                </p>
                <p className="text-[11px] text-slate-500">Incoming, cooking & ready</p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Fulfilled Orders
                </span>
                <p className="text-3xl font-extrabold text-emerald-300">
                  {operationalSummary.completedCount}
                </p>
                <p className="text-[11px] text-slate-500">Completed & served</p>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Gross Order Volume
                </span>
                <p className="text-3xl font-extrabold text-blue-300">
                  ${operationalSummary.grossVolume.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500">Server-calculated total</p>
              </div>
            </div>

            {/* TAB 1: ORDERS & OPERATIONS */}
            {activeTab === "ORDERS" ? (
              <div className="space-y-6">
                {ordersError ? (
                  <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-sm">
                    {ordersError}
                  </div>
                ) : null}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  {/* Status Filter */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 mr-1 font-semibold">Status:</span>
                    {(["ALL", "INCOMING", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as StatusFilter[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            statusFilter === st
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>

                  {/* Time Filter */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 mr-1 font-semibold">Period:</span>
                    {(["ALL", "TODAY", "WEEK"] as TimeFilter[]).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setTimeFilter(period)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          timeFilter === period
                            ? "bg-slate-700 text-white"
                            : "bg-slate-800/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        {period === "ALL" ? "All Time" : period === "TODAY" ? "Today" : "7 Days"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders List Table */}
                {isOrdersLoading && orders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">Loading orders...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
                    No orders found matching the selected filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Order ID</th>
                          <th className="px-5 py-3.5">Time</th>
                          <th className="px-5 py-3.5">Table / Room</th>
                          <th className="px-5 py-3.5">Items</th>
                          <th className="px-5 py-3.5">Server Total</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredOrders.map((order) => {
                          const time = new Date(order.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-4 font-mono font-bold text-white text-xs">
                                #{order.id.slice(0, 8)}
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-400">{time}</td>
                              <td className="px-5 py-4 text-xs">
                                {order.table?.name ? (
                                  <span className="font-semibold text-slate-200">Table {order.table.name}</span>
                                ) : order.room?.name ? (
                                  <span className="font-semibold text-slate-200">Room {order.room.name}</span>
                                ) : (
                                  <span className="text-slate-500">Dine-In</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-xs">
                                {order.items.map((i) => `${i.quantity}x ${i.menuItem?.name || "Item"}`).join(", ")}
                              </td>
                              <td className="px-5 py-4 font-bold text-emerald-400 text-sm">
                                ${Number(order.total).toFixed(2)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                    order.status === "COMPLETED"
                                      ? "bg-slate-800 text-slate-300 border-slate-700"
                                      : order.status === "READY"
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : order.status === "PREPARING"
                                      ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                      : order.status === "CANCELLED"
                                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setInspectedOrder(order)}
                                  className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                  Inspect
                                </button>
                                {order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAdminCancelOrder(order.id)}
                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {/* TAB 2: MENU & PRICING MANAGEMENT */}
            {activeTab === "MENU" ? (
              <div className="space-y-6">
                {menuError ? (
                  <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-sm">
                    {menuError}
                  </div>
                ) : null}

                {isMenuLoading && menus.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">Loading restaurant menus...</div>
                ) : menus.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
                    No menus found for this restaurant.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {menus.map((menu) => (
                      <div
                        key={menu.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-white">{menu.name}</h3>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  menu.active
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {menu.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            {menu.description ? (
                              <p className="text-xs text-slate-400 mt-1">{menu.description}</p>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenAddItem(menu.id)}
                            className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <span>+</span>
                            <span>Add Menu Item</span>
                          </button>
                        </div>

                        {/* Menu Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="pb-3">Item Name</th>
                                <th className="pb-3">Category</th>
                                <th className="pb-3">Price</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {menu.items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="py-3.5">
                                    <p className="font-bold text-white text-sm">{item.name}</p>
                                    {item.description ? (
                                      <p className="text-xs text-slate-400 truncate max-w-md">
                                        {item.description}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td className="py-3.5 text-xs">
                                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                                      {item.category || "General"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-bold text-emerald-400 text-sm">
                                    ${Number(item.price).toFixed(2)}
                                  </td>
                                  <td className="py-3.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleItemActive(menu.id, item)}
                                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                                        item.active
                                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                                          : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                                      }`}
                                    >
                                      {item.active ? "Active" : "Disabled"}
                                    </button>
                                  </td>
                                  <td className="py-3.5 text-right space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditItem(menu.id, item)}
                                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => item.id && handleDeleteItem(menu.id, item.id)}
                                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Inspect Order Modal */}
      {inspectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Order #{inspectedOrder.id.slice(0, 8)}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {inspectedOrder.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{inspectedOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Created At</span>
                  <span className="font-semibold text-slate-200">
                    {new Date(inspectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Table / Room</span>
                  <span className="font-semibold text-slate-200">
                    {inspectedOrder.table?.name
                      ? `Table ${inspectedOrder.table.name}`
                      : inspectedOrder.room?.name
                      ? `Room ${inspectedOrder.room.name}`
                      : "General Dining"}
                  </span>
                </div>
              </div>

              {inspectedOrder.specialInstructions ? (
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-xs">
                  <span className="font-bold text-slate-300 block mb-1">
                    Special Instructions / Notes:
                  </span>
                  <p className="text-slate-200 whitespace-pre-line">
                    {inspectedOrder.specialInstructions}
                  </p>
                </div>
              ) : null}

              {/* Items Detail */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Order Items:
                </span>
                <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                  {inspectedOrder.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
                      <div>
                        <span className="font-bold text-white text-sm">
                          {item.quantity}x {item.menuItem?.name || "Item"}
                        </span>
                        {item.notes ? (
                          <span className="text-amber-300/90 block mt-0.5">Note: {item.notes}</span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">(${Number(item.unitPrice).toFixed(2)} ea)</span>{" "}
                        <span className="font-bold text-emerald-400 ml-2">
                          ${Number(item.subtotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-300 text-sm">Server-Calculated Total</span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  ${Number(inspectedOrder.total).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create / Edit Menu Item Modal */}
      {isItemModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingItem?.item ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {itemSaveError ? (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs">
                {itemSaveError}
              </div>
            ) : null}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  placeholder="e.g. Wagyu Ribeye"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={itemFormCategory}
                    onChange={(e) => setItemFormCategory(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Sides">Sides</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Drinks">Drinks</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(e.target.value)}
                    placeholder="48.00"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description (optional)</label>
                <textarea
                  value={itemFormDescription}
                  onChange={(e) => setItemFormDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. 250g grilled Wagyu ribeye with truffle herb butter..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={isSavingItem}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg disabled:opacity-50"
              >
                {isSavingItem ? "Saving..." : "Save Item"}
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
