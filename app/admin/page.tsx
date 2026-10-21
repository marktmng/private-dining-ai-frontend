"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TacticalHeader from "@/components/TacticalHeader";
import TacticalLoginModal from "@/components/LoginModal";
import TacticalTicker from "@/components/TacticalTicker";
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
import {
  BarChart3,
  Receipt,
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  FileText,
  X,
  Sparkles,
} from "lucide-react";

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
      if (statusFilter === "INCOMING") {
        const isIncoming =
          order.status === "PENDING" ||
          order.status === "CONFIRMED" ||
          order.status === "SENT_TO_KITCHEN";
        if (!isIncoming) return false;
      } else if (statusFilter !== "ALL") {
        if (order.status !== statusFilter) return false;
      }

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

  // Operational metrics
  const operationalSummary = useMemo(() => {
    const totalCount = orders.length;
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const activeOrders = orders.filter(
      (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
    );
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

    const totalCompletedRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );

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
    <main className="min-h-screen bg-[#191814] text-[#F3EFE6] tactical-grid flex flex-col justify-between select-none">
      {/* Top Telemetry Header */}
      <TacticalHeader
        user={currentUser}
        restaurantName={restaurantName}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        menuItemCount={menus.reduce((acc, m) => acc + (m.items?.length || 0), 0)}
        currentPath="/admin"
      />

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Header */}
        <div className="corner-bracket-container bg-[#1C1A15]/90 border border-[#B68A2D]/30 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="corner-bracket-tl !w-3 !h-3" />
          <div className="corner-bracket-tr !w-3 !h-3" />
          <div className="corner-bracket-bl !w-3 !h-3" />
          <div className="corner-bracket-br !w-3 !h-3" />

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#28251E] border border-[#B68A2D] flex items-center justify-center shadow-[0_0_15px_rgba(182,138,45,0.3)]">
              <BarChart3 className="w-6 h-6 text-[#22D3EE]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg sm:text-2xl font-extrabold tracking-widest uppercase text-[#F3EFE6]">
                  Manager Operations Dashboard
                </h1>
                <span className="font-mono text-[10px] bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40 px-2 py-0.5 rounded">
                  PORTAL ACTIVE
                </span>
              </div>
              <p className="font-mono text-xs text-[#B68A2D]/80 mt-0.5">
                Authoritative order telemetry, revenue audits, and live database menu pricing
              </p>
            </div>
          </div>

          {authToken && (
            <div className="flex items-center bg-[#201E19] border border-[#B68A2D]/30 rounded-xl p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("ORDERS")}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "ORDERS"
                    ? "bg-[#B68A2D] text-[#191814] shadow-[0_0_12px_rgba(182,138,45,0.4)]"
                    : "text-[#F3EFE6]/70 hover:text-white"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>ORDERS & AUDIT</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MENU")}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "MENU"
                    ? "bg-[#B68A2D] text-[#191814] shadow-[0_0_12px_rgba(182,138,45,0.4)]"
                    : "text-[#F3EFE6]/70 hover:text-white"
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>MENU & PRICING</span>
              </button>
            </div>
          )}
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
              Manager Authentication Required
            </h2>
            <p className="font-mono text-xs text-[#B68A2D]/80 leading-relaxed">
              Please sign in with Restaurant A credentials (Owner/Admin) to audit live financial streams, review tickets, and modify menu items.
            </p>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="mt-2 px-6 py-2.5 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#191814] shadow-[0_0_20px_rgba(182,138,45,0.4)] hover:opacity-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              Sign In to Manager Portal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Operational Summary Telemetry Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="corner-bracket-container rounded-2xl bg-[#1C1A15] border border-[#B68A2D]/25 p-4 sm:p-5 space-y-1 shadow-md">
                <div className="corner-bracket-tl !w-2.5 !h-2.5" />
                <div className="corner-bracket-tr !w-2.5 !h-2.5" />
                <span className="font-mono text-[10px] text-[#B68A2D] uppercase tracking-wider block">
                  Total Tickets
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F3EFE6]">
                  {operationalSummary.totalCount}
                </p>
                <p className="font-mono text-[9px] text-[#F3EFE6]/50">Authoritative DB records</p>
              </div>

              <div className="corner-bracket-container rounded-2xl bg-[#1C1A15] border border-[#F59E0B]/30 p-4 sm:p-5 space-y-1 shadow-md">
                <div className="corner-bracket-tl !w-2.5 !h-2.5 !border-[#F59E0B]" />
                <div className="corner-bracket-tr !w-2.5 !h-2.5 !border-[#F59E0B]" />
                <span className="font-mono text-[10px] text-[#F59E0B] uppercase tracking-wider block">
                  Active In Kitchen
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F59E0B]">
                  {operationalSummary.activeCount}
                </p>
                <p className="font-mono text-[9px] text-[#F3EFE6]/50">Cooking & awaiting service</p>
              </div>

              <div className="corner-bracket-container rounded-2xl bg-[#1C1A15] border border-[#10B981]/30 p-4 sm:p-5 space-y-1 shadow-md">
                <div className="corner-bracket-tl !w-2.5 !h-2.5 !border-[#10B981]" />
                <div className="corner-bracket-tr !w-2.5 !h-2.5 !border-[#10B981]" />
                <span className="font-mono text-[10px] text-[#10B981] uppercase tracking-wider block">
                  Fulfilled Orders
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#10B981]">
                  {operationalSummary.completedCount}
                </p>
                <p className="font-mono text-[9px] text-[#F3EFE6]/50">Served & completed</p>
              </div>

              <div className="corner-bracket-container rounded-2xl bg-[#1C1A15] border border-[#22D3EE]/30 p-4 sm:p-5 space-y-1 shadow-md">
                <div className="corner-bracket-tl !w-2.5 !h-2.5 !border-[#22D3EE]" />
                <div className="corner-bracket-tr !w-2.5 !h-2.5 !border-[#22D3EE]" />
                <span className="font-mono text-[10px] text-[#22D3EE] uppercase tracking-wider block">
                  Gross Order Volume
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#E5C378]">
                  ${operationalSummary.grossVolume.toFixed(2)}
                </p>
                <p className="font-mono text-[9px] text-[#F3EFE6]/50">Server verified revenue</p>
              </div>
            </div>

            {/* TAB 1: ORDERS & AUDIT */}
            {activeTab === "ORDERS" ? (
              <div className="space-y-6">
                {ordersError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 font-mono text-xs">
                    {ordersError}
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1C1A15]/80 border border-[#B68A2D]/25 rounded-2xl p-4 font-mono text-xs">
                  {/* Status Filter */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#B68A2D] mr-1 font-bold">STATUS:</span>
                    {(["ALL", "INCOMING", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as StatusFilter[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            statusFilter === st
                              ? "bg-[#B68A2D] text-[#191814]"
                              : "bg-[#211F1A] text-[#F3EFE6]/70 hover:text-white border border-[#B68A2D]/20"
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>

                  {/* Time Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#B68A2D] mr-1 font-bold">PERIOD:</span>
                    {(["ALL", "TODAY", "WEEK"] as TimeFilter[]).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setTimeFilter(period)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          timeFilter === period
                            ? "bg-[#2A261E] text-[#E5C378] border border-[#B68A2D]"
                            : "bg-[#211F1A] text-[#F3EFE6]/60 hover:text-white border border-[#B68A2D]/20"
                        }`}
                      >
                        {period === "ALL" ? "ALL TIME" : period === "TODAY" ? "TODAY" : "7 DAYS"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders List Table */}
                {isOrdersLoading && orders.length === 0 ? (
                  <div className="p-12 text-center font-mono text-xs text-[#B68A2D] animate-pulse">
                    FETCHING AUDIT RECORDS...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="corner-bracket-container rounded-2xl border border-[#B68A2D]/20 bg-[#1C1A15]/60 p-12 text-center font-mono text-xs text-[#F3EFE6]/60">
                    No orders match the selected filter criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#B68A2D]/30 bg-[#1C1A15] shadow-xl">
                    <table className="w-full text-left text-xs text-[#F3EFE6]/90 font-mono">
                      <thead className="bg-[#211F1A] border-b border-[#B68A2D]/25 text-[10px] font-bold uppercase text-[#B68A2D] tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Ticket ID</th>
                          <th className="px-5 py-3.5">Timestamp</th>
                          <th className="px-5 py-3.5">Table</th>
                          <th className="px-5 py-3.5">Items Summary</th>
                          <th className="px-5 py-3.5">Server Total</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#B68A2D]/15">
                        {filteredOrders.map((order) => {
                          const time = new Date(order.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <tr key={order.id} className="hover:bg-[#211F1A]/60 transition-colors">
                              <td className="px-5 py-4 font-bold text-[#E5C378]">
                                #{order.id.slice(0, 8)}
                              </td>
                              <td className="px-5 py-4 text-[#F3EFE6]/50">{time}</td>
                              <td className="px-5 py-4">
                                <span className="text-[#F3EFE6] font-semibold">
                                  {order.table?.name ? `Table ${order.table.name}` : "VIP Suite 01"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-[#F3EFE6]/80 max-w-xs truncate">
                                {order.items.map((i) => `${i.quantity}x ${i.menuItem?.name || "Item"}`).join(", ")}
                              </td>
                              <td className="px-5 py-4 font-bold text-[#E5C378] text-sm">
                                ${Number(order.total).toFixed(2)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                    order.status === "COMPLETED"
                                      ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40"
                                      : order.status === "READY"
                                      ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40"
                                      : order.status === "PREPARING"
                                      ? "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/40"
                                      : order.status === "CANCELLED"
                                      ? "bg-red-950/40 text-red-300 border-red-500/40"
                                      : "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40"
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setInspectedOrder(order)}
                                  className="text-xs bg-[#211F1A] hover:bg-[#28251E] text-[#E5C378] border border-[#B68A2D]/30 px-3 py-1 rounded transition-colors font-bold cursor-pointer"
                                >
                                  INSPECT
                                </button>
                                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdminCancelOrder(order.id)}
                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
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
                {menuError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 font-mono text-xs">
                    {menuError}
                  </div>
                )}

                {isMenuLoading && menus.length === 0 ? (
                  <div className="p-12 text-center font-mono text-xs text-[#B68A2D] animate-pulse">
                    LOADING RESTAURANT MENUS...
                  </div>
                ) : menus.length === 0 ? (
                  <div className="corner-bracket-container rounded-2xl border border-[#B68A2D]/20 bg-[#1C1A15]/60 p-12 text-center font-mono text-xs text-[#F3EFE6]/60">
                    No active menus registered for this restaurant.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {menus.map((menu) => (
                      <div
                        key={menu.id}
                        className="corner-bracket-container rounded-2xl border border-[#B68A2D]/30 bg-[#1C1A15] p-5 sm:p-6 shadow-xl space-y-4"
                      >
                        <div className="corner-bracket-tl !w-3 !h-3" />
                        <div className="corner-bracket-tr !w-3 !h-3" />
                        <div className="corner-bracket-bl !w-3 !h-3" />
                        <div className="corner-bracket-br !w-3 !h-3" />

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#B68A2D]/20">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-mono text-lg font-bold text-[#F3EFE6] uppercase">
                                {menu.name}
                              </h3>
                              <span
                                className={`font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  menu.active
                                    ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                                    : "bg-[#211F1A] text-[#F3EFE6]/50"
                                }`}
                              >
                                {menu.active ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </div>
                            {menu.description && (
                              <p className="font-mono text-xs text-[#B68A2D]/80 mt-0.5">{menu.description}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenAddItem(menu.id)}
                            className="font-mono text-xs font-bold bg-[#B68A2D] hover:bg-[#C89B37] text-[#191814] px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Menu Item</span>
                          </button>
                        </div>

                        {/* Menu Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono text-[#F3EFE6]/90">
                            <thead className="text-[10px] font-bold uppercase text-[#B68A2D] border-b border-[#B68A2D]/20">
                              <tr>
                                <th className="pb-3">Item Name</th>
                                <th className="pb-3">Category</th>
                                <th className="pb-3">Price</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#B68A2D]/15">
                              {menu.items.map((item) => (
                                <tr key={item.id} className="hover:bg-[#211F1A]/60 transition-colors">
                                  <td className="py-3.5">
                                    <p className="font-bold text-sm text-[#F3EFE6]">{item.name}</p>
                                    {item.description && (
                                      <p className="text-xs text-[#F3EFE6]/60 truncate max-w-md mt-0.5">
                                        {item.description}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3.5">
                                    <span className="bg-[#211F1A] text-[#E5C378] border border-[#B68A2D]/25 px-2 py-0.5 rounded font-medium">
                                      {item.category || "General"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-bold text-[#E5C378] text-sm">
                                    ${Number(item.price).toFixed(2)}
                                  </td>
                                  <td className="py-3.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleItemActive(menu.id, item)}
                                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                                        item.active
                                          ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40"
                                          : "bg-[#211F1A] text-[#F3EFE6]/40 border-[#B68A2D]/20"
                                      }`}
                                    >
                                      {item.active ? "ACTIVE" : "DISABLED"}
                                    </button>
                                  </td>
                                  <td className="py-3.5 text-right space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditItem(menu.id, item)}
                                      className="text-xs text-[#22D3EE] hover:underline font-bold cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => item.id && handleDeleteItem(menu.id, item.id)}
                                      className="text-xs text-red-400 hover:underline font-bold cursor-pointer"
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
      {inspectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
          <div className="corner-bracket-container w-full max-w-lg rounded-2xl bg-[#1C1A15] border border-[#B68A2D]/40 p-6 shadow-2xl text-[#F3EFE6] space-y-4">
            <div className="corner-bracket-tl !w-3.5 !h-3.5" />
            <div className="corner-bracket-tr !w-3.5 !h-3.5" />
            <div className="corner-bracket-bl !w-3.5 !h-3.5" />
            <div className="corner-bracket-br !w-3.5 !h-3.5" />

            <div className="flex items-center justify-between pb-3 border-b border-[#B68A2D]/25">
              <div>
                <h3 className="text-base font-bold text-[#E5C378] flex items-center gap-2">
                  <span>ORDER #{inspectedOrder.id.slice(0, 8)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B68A2D]/20 text-[#B68A2D] border border-[#B68A2D]/40">
                    {inspectedOrder.status}
                  </span>
                </h3>
                <p className="text-[10px] text-[#F3EFE6]/50 mt-0.5">{inspectedOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="text-[#B68A2D]/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#211F1A] p-3 rounded-xl border border-[#B68A2D]/20">
                <div>
                  <span className="text-[#B68A2D] block text-[10px] uppercase">Placed At</span>
                  <span className="font-semibold text-[#F3EFE6]">
                    {new Date(inspectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#B68A2D] block text-[10px] uppercase">Table Allocation</span>
                  <span className="font-semibold text-[#F3EFE6]">
                    {inspectedOrder.table?.name ? `Table ${inspectedOrder.table.name}` : "VIP Suite 01"}
                  </span>
                </div>
              </div>

              {inspectedOrder.specialInstructions && (
                <div className="p-3 rounded-xl bg-[#211F1A] border border-[#B68A2D]/20">
                  <span className="font-bold text-[#E5C378] text-[10px] uppercase block mb-1">
                    Special Instructions / Notes:
                  </span>
                  <p className="text-[#F3EFE6]/90">{inspectedOrder.specialInstructions}</p>
                </div>
              )}

              {/* Items Detail */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-[#B68A2D] uppercase tracking-wide">
                  Order Line Items:
                </span>
                <div className="divide-y divide-[#B68A2D]/15 max-h-56 overflow-y-auto pr-1">
                  {inspectedOrder.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-start justify-between">
                      <div>
                        <span className="font-bold text-[#F3EFE6]">
                          {item.quantity}x {item.menuItem?.name || "Item"}
                        </span>
                        {item.notes && (
                          <span className="text-[#B68A2D] block text-[10px] mt-0.5">Note: {item.notes}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[#F3EFE6]/50 text-[10px]">(${Number(item.unitPrice).toFixed(2)} ea)</span>{" "}
                        <span className="font-bold text-[#E5C378] ml-2">
                          ${Number(item.subtotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#B68A2D]/25 flex items-center justify-between">
                <span className="font-bold text-[#F3EFE6]/80 uppercase">Server-Calculated Total</span>
                <span className="text-xl font-extrabold text-[#E5C378]">
                  ${Number(inspectedOrder.total).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectedOrder(null)}
                className="px-4 py-2 text-xs bg-[#211F1A] hover:bg-[#28251E] text-[#E5C378] border border-[#B68A2D]/40 rounded-xl font-bold cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Menu Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
          <div className="corner-bracket-container w-full max-w-md rounded-2xl bg-[#1C1A15] border border-[#B68A2D]/40 p-6 shadow-2xl text-[#F3EFE6] space-y-4">
            <div className="corner-bracket-tl !w-3.5 !h-3.5" />
            <div className="corner-bracket-tr !w-3.5 !h-3.5" />
            <div className="corner-bracket-bl !w-3.5 !h-3.5" />
            <div className="corner-bracket-br !w-3.5 !h-3.5" />

            <div className="flex items-center justify-between pb-3 border-b border-[#B68A2D]/25">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#E5C378]">
                {editingItem?.item ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-[#B68A2D]/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {itemSaveError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs">
                {itemSaveError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#B68A2D] uppercase tracking-wider mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  placeholder="e.g. Wagyu Ribeye"
                  className="w-full rounded-xl bg-[#191814] border border-[#B68A2D]/30 p-2.5 text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none focus:border-[#B68A2D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#B68A2D] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={itemFormCategory}
                    onChange={(e) => setItemFormCategory(e.target.value)}
                    className="w-full rounded-xl bg-[#191814] border border-[#B68A2D]/30 p-2.5 text-[#F3EFE6] focus:outline-none focus:border-[#B68A2D]"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Sides">Sides</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Drinks">Drinks</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#B68A2D] uppercase tracking-wider mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(e.target.value)}
                    placeholder="48.00"
                    className="w-full rounded-xl bg-[#191814] border border-[#B68A2D]/30 p-2.5 text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none focus:border-[#B68A2D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#B68A2D] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={itemFormDescription}
                  onChange={(e) => setItemFormDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. 250g grilled Wagyu ribeye with truffle herb butter..."
                  className="w-full rounded-xl bg-[#191814] border border-[#B68A2D]/30 p-2.5 text-[#F3EFE6] placeholder-[#F3EFE6]/30 focus:outline-none focus:border-[#B68A2D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 text-xs text-[#F3EFE6]/70 hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={isSavingItem}
                className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-[#B68A2D] to-[#E5C378] text-[#191814] rounded-xl shadow-[0_0_15px_rgba(182,138,45,0.4)] disabled:opacity-50 uppercase tracking-wider cursor-pointer"
              >
                {isSavingItem ? "Saving..." : "Save Item"}
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
