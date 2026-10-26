"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TacticalHeader from "@/components/TacticalHeader";
import TacticalLoginModal from "@/components/LoginModal";
import TacticalTicker from "@/components/TacticalTicker";
import {
  createCategory,
  createLocation,
  createMenuItem,
  createModifierGroup,
  deleteCategory,
  deleteLocation,
  deleteMenuItem,
  getAnalyticsCharts,
  getAnalyticsOverview,
  getAiInsights,
  getCategories,
  getExportAnalyticsCsvUrl,
  getFullMenus,
  getLocationQr,
  getLocations,
  getMe,
  getModifierGroups,
  getOrders,
  refundPayment,
  updateCategory,
  updateLocation,
  updateMenuItem,
  updateOrderStatus,
  updateRestaurantMe,
  assignItemModifiers,
} from "@/lib/api";
import type {
  AiInsightItem,
  AnalyticsCharts,
  AnalyticsOverview,
  AuthUser,
  BusinessType,
  Category,
  CreateMenuItemPayload,
  LocationType,
  MenuItem,
  MenuWithItems,
  ModifierGroup,
  OrderingLocation,
  PersistedOrder,
  PublicRestaurantInfo,
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
  MapPin,
  QrCode,
  Layers,
  Settings,
  Download,
  Percent,
  TrendingUp,
  CreditCard,
  Users,
  Check,
  Building,
  ChefHat,
} from "lucide-react";

const TOKEN_STORAGE_KEY = "aivora_auth_token";

type AdminTab =
  | "ORDERS"
  | "MENU"
  | "CATEGORIES"
  | "MODIFIERS"
  | "LOCATIONS"
  | "ANALYTICS"
  | "SETTINGS";

const BUSINESS_TYPES: BusinessType[] = [
  "RESTAURANT",
  "HOTEL",
  "CAFE",
  "ICE_CREAM_SHOP",
  "FOOD_KIOSK",
  "FOOD_TRUCK",
  "TAKEAWAY",
  "SNACK_SHOP",
  "OTHER",
];

export default function AdminPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant A");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("ORDERS");

  // ==========================================
  // 1. ORDERS STATE
  // ==========================================
  const [orders, setOrders] = useState<PersistedOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [inspectedOrder, setInspectedOrder] = useState<PersistedOrder | null>(null);

  // ==========================================
  // 2. MENU & CATEGORIES STATE
  // ==========================================
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(false);

  // Menu Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ menuId: string; item?: MenuItem } | null>(null);
  const [itemFormName, setItemFormName] = useState("");
  const [itemFormCategoryId, setItemFormCategoryId] = useState("");
  const [itemFormPrice, setItemFormPrice] = useState("");
  const [itemFormDescription, setItemFormDescription] = useState("");
  const [itemFormPrepTime, setItemFormPrepTime] = useState("");
  const [itemFormDietary, setItemFormDietary] = useState("");
  const [itemFormSelectedModGroups, setItemFormSelectedModGroups] = useState<string[]>([]);

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormDescription, setCategoryFormDescription] = useState("");

  // Modifier Group Modal
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [modFormName, setModFormName] = useState("");
  const [modFormRequired, setModFormRequired] = useState(false);
  const [modFormMax, setModFormMax] = useState(1);
  const [modFormOptionName1, setModFormOptionName1] = useState("");
  const [modFormOptionPrice1, setModFormOptionPrice1] = useState("0");
  const [modFormOptionName2, setModFormOptionName2] = useState("");
  const [modFormOptionPrice2, setModFormOptionPrice2] = useState("0");

  // ==========================================
  // 3. LOCATIONS & QR STATE
  // ==========================================
  const [locations, setLocations] = useState<OrderingLocation[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locFormName, setLocFormName] = useState("");
  const [locFormCode, setLocFormCode] = useState("");
  const [locFormType, setLocFormType] = useState<LocationType>("TABLE");
  const [locFormFulfillment, setLocFormFulfillment] = useState("TABLE_SERVICE");
  const [qrModalData, setQrModalData] = useState<{ qrDataUrl: string; targetUrl: string; locName: string } | null>(null);

  // ==========================================
  // 4. ANALYTICS & AI INSIGHTS STATE
  // ==========================================
  const [analyticsPeriod, setAnalyticsPeriod] = useState("this_month");
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [analyticsCharts, setAnalyticsCharts] = useState<AnalyticsCharts | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsightItem[]>([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  // ==========================================
  // 5. BUSINESS SETTINGS STATE
  // ==========================================
  const [settingsProfile, setSettingsProfile] = useState<PublicRestaurantInfo | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("RESTAURANT");
  const [currency, setCurrency] = useState("USD");
  const [taxRatePercent, setTaxRatePercent] = useState("10");
  const [timezone, setTimezone] = useState("America/New_York");
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // 1. Check saved auth token on mount
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
          restaurantSlug: data.restaurant?.slug || "",
          businessType: data.restaurant?.businessType || "RESTAURANT",
          currency: data.restaurant?.currency || "USD",
          role: data.role,
        });
        if (data.restaurant?.name) {
          setRestaurantName(data.restaurant.name);
          setBusinessName(data.restaurant.name);
          if (data.restaurant.businessType) {
            setBusinessType(data.restaurant.businessType as BusinessType);
          }
          if (data.restaurant.currency) setCurrency(data.restaurant.currency);
          if (data.restaurant.taxRate !== undefined) {
            setTaxRatePercent((Number(data.restaurant.taxRate) * 100).toString());
          }
          if (data.restaurant.timezone) setTimezone(data.restaurant.timezone);
          if (data.restaurant.orderingEnabled !== undefined) {
            setOrderingEnabled(data.restaurant.orderingEnabled);
          }
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
      });
  }, []);

  // 2. Fetch data based on active tab
  const refreshCurrentData = useCallback(() => {
    if (!authToken) return;

    if (activeTab === "ORDERS") {
      setIsOrdersLoading(true);
      getOrders(authToken)
        .then(setOrders)
        .catch((e) => setOrdersError(e.message))
        .finally(() => setIsOrdersLoading(false));
    } else if (activeTab === "MENU" || activeTab === "CATEGORIES" || activeTab === "MODIFIERS") {
      setIsMenuLoading(true);
      Promise.all([
        getFullMenus(authToken),
        getCategories(authToken),
        getModifierGroups(authToken),
      ])
        .then(([m, c, g]) => {
          setMenus(m);
          setCategories(c);
          setModifierGroups(g);
        })
        .finally(() => setIsMenuLoading(false));
    } else if (activeTab === "LOCATIONS") {
      getLocations(authToken).then(setLocations);
    } else if (activeTab === "ANALYTICS") {
      setIsAnalyticsLoading(true);
      Promise.all([
        getAnalyticsOverview(authToken, analyticsPeriod),
        getAnalyticsCharts(authToken, analyticsPeriod),
        getAiInsights(authToken, analyticsPeriod),
      ])
        .then(([ov, ch, ins]) => {
          setAnalyticsOverview(ov);
          setAnalyticsCharts(ch);
          setAiInsights(ins);
        })
        .finally(() => setIsAnalyticsLoading(false));
    }
  }, [authToken, activeTab, analyticsPeriod]);

  useEffect(() => {
    refreshCurrentData();
  }, [refreshCurrentData]);

  // Auth Handlers
  const handleLoginSuccess = (token: string, user: AuthUser) => {
    setAuthToken(token);
    setCurrentUser(user);
    if (user.restaurantName) setRestaurantName(user.restaurantName);
    refreshCurrentData();
  };

  const handleSignOut = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setRestaurantName("Restaurant A");
  };

  // Menu Item Modal Save
  const handleSaveMenuItem = async () => {
    if (!authToken || !editingItem || !itemFormName.trim() || !itemFormPrice) return;
    const priceNum = parseFloat(itemFormPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    try {
      const payload: CreateMenuItemPayload = {
        name: itemFormName.trim(),
        price: priceNum,
        description: itemFormDescription.trim() || undefined,
        categoryId: itemFormCategoryId || null,
        preparationTime: itemFormPrepTime ? parseInt(itemFormPrepTime) : undefined,
        dietaryTags: itemFormDietary
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      };

      let savedItemId = "";
      if (editingItem.item?.id) {
        const updated = await updateMenuItem(editingItem.menuId, editingItem.item.id, payload, authToken);
        savedItemId = updated.id!;
      } else {
        const created = await createMenuItem(editingItem.menuId, payload, authToken);
        savedItemId = created.id!;
      }

      // Assign modifiers
      if (savedItemId && itemFormSelectedModGroups.length > 0) {
        await assignItemModifiers(authToken, savedItemId, itemFormSelectedModGroups);
      }

      setIsItemModalOpen(false);
      refreshCurrentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save item");
    }
  };

  // Category Modal Save
  const handleSaveCategory = async () => {
    if (!authToken || !categoryFormName.trim()) return;
    try {
      await createCategory(authToken, {
        name: categoryFormName.trim(),
        description: categoryFormDescription.trim() || undefined,
      });
      setIsCategoryModalOpen(false);
      setCategoryFormName("");
      setCategoryFormDescription("");
      refreshCurrentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  // Modifier Group Modal Save
  const handleSaveModifierGroup = async () => {
    if (!authToken || !modFormName.trim() || !modFormOptionName1.trim()) return;
    try {
      const options = [
        { name: modFormOptionName1.trim(), priceAdjustment: parseFloat(modFormOptionPrice1) || 0 },
      ];
      if (modFormOptionName2.trim()) {
        options.push({
          name: modFormOptionName2.trim(),
          priceAdjustment: parseFloat(modFormOptionPrice2) || 0,
        });
      }

      await createModifierGroup(authToken, {
        name: modFormName.trim(),
        required: modFormRequired,
        maxSelections: modFormMax,
        options,
      });

      setIsModModalOpen(false);
      setModFormName("");
      setModFormOptionName1("");
      setModFormOptionName2("");
      refreshCurrentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create modifier group");
    }
  };

  // Location Modal Save
  const handleSaveLocation = async () => {
    if (!authToken || !locFormName.trim() || !locFormCode.trim()) return;
    try {
      await createLocation(authToken, {
        name: locFormName.trim(),
        code: locFormCode.trim().toUpperCase(),
        type: locFormType,
        fulfillmentMethod: locFormFulfillment,
      });
      setIsLocationModalOpen(false);
      setLocFormName("");
      setLocFormCode("");
      refreshCurrentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create location");
    }
  };

  // Generate / View QR Code
  const handleViewLocationQr = async (loc: OrderingLocation) => {
    if (!authToken) return;
    try {
      const res = await getLocationQr(authToken, loc.id);
      setQrModalData({
        qrDataUrl: res.qrDataUrl,
        targetUrl: res.targetUrl,
        locName: loc.name,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate QR");
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!authToken) return;
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await updateRestaurantMe(authToken, {
        name: businessName.trim(),
        businessType,
        currency,
        taxRate: (parseFloat(taxRatePercent) || 0) / 100,
        timezone,
        orderingEnabled,
      });
      setRestaurantName(businessName.trim());
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update business settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Process Refund
  const handleRefund = async (orderId: string, amount: number) => {
    if (!authToken || !confirm(`Issue refund of $${amount.toFixed(2)}?`)) return;
    try {
      // Find completed payment
      const ord = orders.find((o) => o.id === orderId);
      const payment = ord?.payments?.find((p) => p.status === "COMPLETED");
      if (!payment) {
        alert("No completed payment found on this order.");
        return;
      }
      await refundPayment(authToken, payment.id, amount, "Manager refund via portal");
      alert("Refund processed successfully.");
      refreshCurrentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Refund failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#191814] text-[#F3EFE6] tactical-grid flex flex-col justify-between select-none">
      <TacticalHeader
        user={currentUser}
        restaurantName={restaurantName}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        menuItemCount={orders.length}
        currentPath="/admin"
      />

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Manager Banner */}
        <div className="corner-bracket-container bg-[#1C1A15]/90 border border-[#B68A2D]/30 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="corner-bracket-tl !w-3 !h-3" />
          <div className="corner-bracket-tr !w-3 !h-3" />
          <div className="corner-bracket-bl !w-3 !h-3" />
          <div className="corner-bracket-br !w-3 !h-3" />

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#28251E] border border-[#B68A2D] flex items-center justify-center shadow-[0_0_15px_rgba(182,138,45,0.3)]">
              <Building className="w-6 h-6 text-[#E5C378]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg sm:text-2xl font-extrabold tracking-widest uppercase text-[#F3EFE6]">
                  AIVORA SaaS Manager Cockpit
                </h1>
                <span className="font-mono text-[10px] bg-[#B68A2D]/20 text-[#E5C378] border border-[#B68A2D]/40 px-2 py-0.5 rounded font-bold uppercase">
                  {businessType.replace(/_/g, " ")}
                </span>
              </div>
              <p className="font-mono text-xs text-[#B68A2D]/80 mt-0.5">
                Multi-Tenant Administration • Categories, items, modifiers, QR locations, payments & analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {locations.length > 0 && (
              <>
                <a
                  href={`/dine/${currentUser?.restaurantSlug || "test-venue-saas"}/${locations[0].code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex px-3 py-1.5 rounded-xl bg-[#211F1A] hover:bg-[#28251E] border border-amber-500/40 text-amber-300 transition-colors items-center gap-1.5 font-mono text-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Preview Guest QR ↗</span>
                </a>
                <a
                  href="/kitchen"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex px-3 py-1.5 rounded-xl bg-[#211F1A] hover:bg-[#28251E] border border-emerald-500/40 text-emerald-400 transition-colors items-center gap-1.5 font-mono text-xs"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Kitchen KDS ↗</span>
                </a>
              </>
            )}

            <button
              onClick={refreshCurrentData}
              className="px-3.5 py-1.5 rounded-xl bg-[#211F1A] hover:bg-[#28251E] border border-[#B68A2D]/40 text-[#E5C378] transition-colors flex items-center gap-1.5 font-mono text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>SYNC DATA</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#B68A2D]/20 font-mono text-xs">
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "ORDERS"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>ORDERS</span>
          </button>

          <button
            onClick={() => setActiveTab("CATEGORIES")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "CATEGORIES"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>CATEGORIES</span>
          </button>

          <button
            onClick={() => setActiveTab("MENU")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "MENU"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>MENU ITEMS</span>
          </button>

          <button
            onClick={() => setActiveTab("MODIFIERS")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "MODIFIERS"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>MODIFIERS</span>
          </button>

          <button
            onClick={() => setActiveTab("LOCATIONS")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "LOCATIONS"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>LOCATIONS & QR</span>
          </button>

          <button
            onClick={() => setActiveTab("ANALYTICS")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "ANALYTICS"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>ANALYTICS & AI</span>
          </button>

          <button
            onClick={() => setActiveTab("SETTINGS")}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === "SETTINGS"
                ? "bg-[#E5C378] text-[#191814] shadow-md"
                : "bg-[#211F1A] text-neutral-400 hover:text-white border border-[#B68A2D]/20"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>SETTINGS</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ORDERS & PAYMENTS AUDIT                           */}
        {/* ========================================================= */}
        {activeTab === "ORDERS" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase">
                Active Tenant Orders ({orders.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 font-mono text-xs space-y-3 shadow-lg"
                >
                  <div className="flex justify-between items-start border-b border-[#B68A2D]/20 pb-2">
                    <div>
                      <span className="font-bold text-[#E5C378]">
                        #{ord.orderNumber || ord.id.slice(0, 6)}
                      </span>
                      <p className="text-[10px] text-neutral-400">
                        {ord.location?.name || "Direct Guest"} • {ord.orderChannel || "QR"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-amber-400 font-bold text-[10px]">
                      {ord.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {ord.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-neutral-300">
                        <span>
                          {it.quantity}x {it.menuItem?.name || "Dish"}
                        </span>
                        <span className="text-neutral-400">${Number(it.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#B68A2D]/20 pt-2 flex justify-between items-center font-bold">
                    <span className="text-neutral-400">Total:</span>
                    <span className="text-[#E5C378] text-sm">${Number(ord.total).toFixed(2)}</span>
                  </div>

                  {/* Payment & Split Records */}
                  {ord.payments && ord.payments.length > 0 && (
                    <div className="bg-neutral-900/80 p-2 rounded-lg text-[10px] text-neutral-400 space-y-1">
                      <span className="font-bold text-neutral-300 block">Payment Records:</span>
                      {ord.payments.map((p) => (
                        <div key={p.id} className="flex justify-between items-center">
                          <span>
                            {p.status} {p.isSplit ? `(Share ${p.splitIndex}/${p.splitTotal})` : ""}
                          </span>
                          <span className="text-white">${Number(p.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleRefund(ord.id, Number(ord.total))}
                      className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold"
                    >
                      Issue Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MENU CATEGORIES MANAGEMENT                        */}
        {/* ========================================================= */}
        {activeTab === "CATEGORIES" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase">
                  Menu Categories ({categories.length})
                </h2>
                <p className="text-xs text-neutral-400">
                  Organize dishes, beverages, ice cream flavours, and combos.
                </p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#E5C378] text-[#191814] font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW CATEGORY</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 font-mono text-xs space-y-2 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-sm">{cat.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          cat.active
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {cat.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] mt-1 line-clamp-2">
                      {cat.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#B68A2D]/20 flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>Sort Index: {cat.sortOrder}</span>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete category "${cat.name}"?`)) {
                          await deleteCategory(authToken!, cat.id);
                          refreshCurrentData();
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MENU ITEMS MANAGEMENT                             */}
        {/* ========================================================= */}
        {activeTab === "MENU" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase">
                  Menu Items Codex
                </h2>
                <p className="text-xs text-neutral-400">
                  Manage products, prices, preparation timing, dietary tags, and modifiers.
                </p>
              </div>
              <button
                onClick={() => {
                  const firstMenu = menus[0];
                  if (!firstMenu) return;
                  setEditingItem({ menuId: firstMenu.id });
                  setItemFormName("");
                  setItemFormPrice("");
                  setItemFormDescription("");
                  setItemFormPrepTime("15");
                  setItemFormDietary("");
                  setItemFormCategoryId(categories[0]?.id || "");
                  setItemFormSelectedModGroups([]);
                  setIsItemModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#E5C378] text-[#191814] font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW ITEM</span>
              </button>
            </div>

            <div className="space-y-6">
              {menus.map((menu) => (
                <div key={menu.id} className="space-y-3">
                  <h3 className="font-mono text-xs font-bold text-[#E5C378] uppercase border-b border-[#B68A2D]/20 pb-1">
                    {menu.name} ({menu.items.length} items)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menu.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 font-mono text-xs flex flex-col justify-between space-y-3 shadow-lg"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <span className="font-bold text-[#E5C378] text-sm">
                              ${Number(item.price).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-neutral-400 text-[11px] mt-1 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.preparationTime && (
                              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                                {item.preparationTime} min
                              </span>
                            )}
                            {item.dietaryTags?.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#B68A2D]/20 flex justify-between items-center text-[11px]">
                          <span className="text-neutral-500">
                            {item.active ? "Available" : "Disabled"}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingItem({ menuId: menu.id, item });
                                setItemFormName(item.name);
                                setItemFormPrice(item.price.toString());
                                setItemFormDescription(item.description || "");
                                setItemFormPrepTime(item.preparationTime?.toString() || "");
                                setItemFormDietary(item.dietaryTags?.join(", ") || "");
                                setItemFormCategoryId(item.categoryId || "");
                                setIsItemModalOpen(true);
                              }}
                              className="text-amber-400 hover:text-amber-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete "${item.name}"?`)) {
                                  await deleteMenuItem(menu.id, item.id!, authToken!);
                                  refreshCurrentData();
                                }
                              }}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MODIFIERS & CUSTOMIZATION                         */}
        {/* ========================================================= */}
        {activeTab === "MODIFIERS" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase">
                  Modifier Groups ({modifierGroups.length})
                </h2>
                <p className="text-xs text-neutral-400">
                  Steak temperatures, gelato scoops, milk options, add-on toppings.
                </p>
              </div>
              <button
                onClick={() => setIsModModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#E5C378] text-[#191814] font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW MODIFIER GROUP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modifierGroups.map((grp) => (
                <div
                  key={grp.id}
                  className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 font-mono text-xs space-y-3 shadow-lg"
                >
                  <div className="flex justify-between items-start border-b border-[#B68A2D]/20 pb-2">
                    <h3 className="font-bold text-white text-sm">{grp.name}</h3>
                    <span className="text-[10px] text-amber-400 font-bold">
                      {grp.required ? "Required" : "Optional"} (Max {grp.maxSelections})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {grp.options.map((opt) => (
                      <div key={opt.id} className="flex justify-between text-neutral-300 text-[11px]">
                        <span>• {opt.name}</span>
                        <span className="text-amber-400">
                          {Number(opt.priceAdjustment) > 0
                            ? `+$${Number(opt.priceAdjustment).toFixed(2)}`
                            : "Free"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: LOCATIONS & QR CODE SYSTEM                        */}
        {/* ========================================================= */}
        {activeTab === "LOCATIONS" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase">
                  Ordering Locations & QR Codes ({locations.length})
                </h2>
                <p className="text-xs text-neutral-400">
                  Generate printable QR codes for tables, hotel rooms, kiosks, or pickup points.
                </p>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#E5C378] text-[#191814] font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW LOCATION</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 font-mono text-xs space-y-3 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-sm">{loc.name}</h3>
                        <span className="text-[10px] text-neutral-400 uppercase">
                          CODE: {loc.code}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold border border-neutral-700">
                        {loc.type}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] mt-2">
                      Fulfillment: {loc.fulfillmentMethod.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#B68A2D]/20 flex justify-between items-center">
                    <button
                      onClick={() => handleViewLocationQr(loc)}
                      className="px-3 py-1 bg-[#E5C378]/20 hover:bg-[#E5C378]/30 border border-[#B68A2D]/40 text-[#E5C378] rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View & Print QR</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete location "${loc.name}"?`)) {
                          await deleteLocation(authToken!, loc.id);
                          refreshCurrentData();
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: REAL DATABASE ANALYTICS & AI INSIGHTS             */}
        {/* ========================================================= */}
        {activeTab === "ANALYTICS" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-mono font-bold text-neutral-300 uppercase">
                  Business Performance & AI Insights
                </h2>
                <p className="text-xs text-neutral-400">
                  Calculated from actual database orders, tax, and payments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={analyticsPeriod}
                  onChange={(e) => setAnalyticsPeriod(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                >
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </select>

                <a
                  href={authToken ? getExportAnalyticsCsvUrl(authToken, analyticsPeriod) : "#"}
                  download
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#E5C378] border border-[#B68A2D]/40 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT CSV</span>
                </a>
              </div>
            </div>

            {/* KPI Cards Grid */}
            {analyticsOverview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 shadow-lg">
                  <span className="text-[10px] text-neutral-400 uppercase">Gross Revenue</span>
                  <div className="text-xl sm:text-2xl font-bold text-[#E5C378] mt-1">
                    ${Number(analyticsOverview.grossRevenue || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    Net: ${Number(analyticsOverview.netRevenue || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 shadow-lg">
                  <span className="text-[10px] text-neutral-400 uppercase">Total Orders</span>
                  <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {analyticsOverview.totalOrders ?? 0}
                  </div>
                  <span className="text-[10px] text-emerald-400">
                    {analyticsOverview.completedOrders ?? 0} completed
                  </span>
                </div>

                <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 shadow-lg">
                  <span className="text-[10px] text-neutral-400 uppercase">Average Order Value</span>
                  <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                    ${Number(analyticsOverview.averageOrderValue || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    Tax: ${Number(analyticsOverview.taxCollected || 0).toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 shadow-lg">
                  <span className="text-[10px] text-neutral-400 uppercase">Refunds / Cancellations</span>
                  <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-1">
                    ${Number(analyticsOverview.refundsTotal || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {analyticsOverview.cancelledOrders ?? 0} cancelled
                  </span>
                </div>
              </div>
            )}

            {/* AI Business Insights Panel (Phase 6 Requirement 23) */}
            <div className="bg-gradient-to-br from-amber-950/30 to-neutral-900 border border-[#B68A2D]/40 rounded-2xl p-5 space-y-3 font-mono">
              <div className="flex items-center gap-2 text-[#E5C378]">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  AI Hospitality Intelligence & Recommendations
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {(aiInsights || []).map((ins, i) => (
                  <div
                    key={i}
                    className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{ins.title}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {ins.type}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">{ins.insight}</p>
                    {ins.metric && (
                      <span className="text-[10px] text-emerald-400 font-semibold block pt-1">
                        Metric: {ins.metric}
                      </span>
                    )}
                  </div>
                ))}
                {(!aiInsights || aiInsights.length === 0) && (
                  <div className="col-span-full p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-neutral-500 text-[11px]">
                    No insights generated for this period yet.
                  </div>
                )}
              </div>
            </div>

            {/* Top Items & Categories Breakdown */}
            {analyticsCharts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 space-y-2">
                  <h4 className="font-bold text-[#E5C378] uppercase">Top-Selling Menu Items</h4>
                  <div className="space-y-1.5">
                    {(analyticsCharts.topItems || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-neutral-300">
                        <span>
                          {idx + 1}. {item.name} ({item.quantity} sold)
                        </span>
                        <span className="font-bold text-white">${Number(item.revenue || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {(!analyticsCharts.topItems || analyticsCharts.topItems.length === 0) && (
                      <p className="text-neutral-500 text-[11px]">No orders recorded yet.</p>
                    )}
                  </div>
                </div>

                <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-4 space-y-2">
                  <h4 className="font-bold text-[#E5C378] uppercase">Ordering Channels</h4>
                  <div className="space-y-1.5">
                    {(analyticsCharts.orderChannels || analyticsCharts.channels || []).map((ch, idx) => (
                      <div key={idx} className="flex justify-between items-center text-neutral-300">
                        <span className="uppercase">{ch.channel}</span>
                        <span className="font-bold text-white">{ch.count ?? ch.orders ?? 0} orders</span>
                      </div>
                    ))}
                    {(!analyticsCharts.orderChannels || analyticsCharts.orderChannels.length === 0) && (
                      <p className="text-neutral-500 text-[11px]">No channels recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: BUSINESS SETTINGS                                 */}
        {/* ========================================================= */}
        {activeTab === "SETTINGS" && (
          <div className="bg-[#1C1A15] border border-[#B68A2D]/30 rounded-2xl p-6 font-mono text-xs space-y-6 max-w-2xl shadow-xl">
            <div className="border-b border-[#B68A2D]/20 pb-3">
              <h2 className="text-base font-bold text-white uppercase">
                Venue Profile & Multi-Tenant Settings
              </h2>
              <p className="text-neutral-400 text-xs mt-0.5">
                Configure business identity, ordering toggles, currency, and tax parameters.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="NZD">NZD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    step="0.1"
                    min="0"
                    max="50"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="orderingToggle"
                  checked={orderingEnabled}
                  onChange={(e) => setOrderingEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="orderingToggle" className="text-white font-bold cursor-pointer">
                  Public Guest Ordering Active
                </label>
              </div>

              {settingsSuccess && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Business settings saved successfully.</span>
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full py-3 bg-[#E5C378] hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-sm transition"
              >
                {isSavingSettings ? "Saving Settings..." : "Save Business Settings"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1A15] border border-[#B68A2D]/40 w-full max-w-md rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#B68A2D]/20 pb-2">
              <h3 className="font-bold text-white text-sm">
                {editingItem?.item ? "Edit Menu Item" : "Create Menu Item"}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-neutral-300 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-300 block mb-1">Category</label>
                <select
                  value={itemFormCategoryId}
                  onChange={(e) => setItemFormCategoryId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 block mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(e.target.value)}
                    step="0.01"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={itemFormPrepTime}
                    onChange={(e) => setItemFormPrepTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 block mb-1">Description</label>
                <textarea
                  value={itemFormDescription}
                  onChange={(e) => setItemFormDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-300 block mb-1">
                  Dietary Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={itemFormDietary}
                  onChange={(e) => setItemFormDietary(e.target.value)}
                  placeholder="gluten-free, vegetarian, vegan"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
              </div>

              {modifierGroups.length > 0 && (
                <div>
                  <label className="text-neutral-300 block mb-1">Assign Modifier Groups</label>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {modifierGroups.map((g) => {
                      const isChecked = itemFormSelectedModGroups.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 p-1.5 bg-neutral-900 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setItemFormSelectedModGroups((prev) => [...prev, g.id]);
                              } else {
                                setItemFormSelectedModGroups((prev) =>
                                  prev.filter((id) => id !== g.id)
                                );
                              }
                            }}
                          />
                          <span>{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#B68A2D]/20">
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="flex-1 py-2 bg-neutral-800 rounded-xl text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuItem}
                className="flex-1 py-2 bg-[#E5C378] text-neutral-950 font-bold rounded-xl"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1A15] border border-[#B68A2D]/40 w-full max-w-sm rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Create Menu Category</h3>
            <div>
              <label className="text-neutral-300 block mb-1">Category Name</label>
              <input
                type="text"
                value={categoryFormName}
                onChange={(e) => setCategoryFormName(e.target.value)}
                placeholder="e.g. Starters, Gelato, Beverages"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-neutral-300 block mb-1">Description (optional)</label>
              <input
                type="text"
                value={categoryFormDescription}
                onChange={(e) => setCategoryFormDescription(e.target.value)}
                placeholder="e.g. Traditional house gelato and cones"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex-1 py-2 bg-neutral-800 rounded-xl text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 py-2 bg-[#E5C378] text-neutral-950 font-bold rounded-xl"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier Group Modal */}
      {isModModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1A15] border border-[#B68A2D]/40 w-full max-w-md rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Create Modifier Group</h3>
            <div>
              <label className="text-neutral-300 block mb-1">Group Name</label>
              <input
                type="text"
                value={modFormName}
                onChange={(e) => setModFormName(e.target.value)}
                placeholder="e.g. Cup or Cone, Milk Type, Doneness"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modFormRequired}
                  onChange={(e) => setModFormRequired(e.target.checked)}
                />
                <span>Required</span>
              </label>
              <div>
                <span>Max picks: </span>
                <input
                  type="number"
                  value={modFormMax}
                  onChange={(e) => setModFormMax(parseInt(e.target.value) || 1)}
                  className="w-14 bg-neutral-900 border border-neutral-700 rounded p-1 text-center text-white"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-[#B68A2D]/20 pt-2">
              <span className="font-bold text-neutral-300 block">Options</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={modFormOptionName1}
                  onChange={(e) => setModFormOptionName1(e.target.value)}
                  placeholder="Option 1 (e.g. Waffle Cone)"
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
                <input
                  type="number"
                  value={modFormOptionPrice1}
                  onChange={(e) => setModFormOptionPrice1(e.target.value)}
                  placeholder="Price (+$)"
                  className="w-24 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={modFormOptionName2}
                  onChange={(e) => setModFormOptionName2(e.target.value)}
                  placeholder="Option 2 (e.g. Cup)"
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
                <input
                  type="number"
                  value={modFormOptionPrice2}
                  onChange={(e) => setModFormOptionPrice2(e.target.value)}
                  placeholder="Price (+$)"
                  className="w-24 bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#B68A2D]/20">
              <button
                onClick={() => setIsModModalOpen(false)}
                className="flex-1 py-2 bg-neutral-800 rounded-xl text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModifierGroup}
                className="flex-1 py-2 bg-[#E5C378] text-neutral-950 font-bold rounded-xl"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1A15] border border-[#B68A2D]/40 w-full max-w-sm rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Add Ordering Location</h3>
            <div>
              <label className="text-neutral-300 block mb-1">Location Name</label>
              <input
                type="text"
                value={locFormName}
                onChange={(e) => setLocFormName(e.target.value)}
                placeholder="e.g. Patio Table 4, Room 204, Kiosk 01"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-neutral-300 block mb-1">Unique Code</label>
              <input
                type="text"
                value={locFormCode}
                onChange={(e) => setLocFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. TABLE-04, ROOM-204"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white uppercase"
              />
            </div>
            <div>
              <label className="text-neutral-300 block mb-1">Location Type</label>
              <select
                value={locFormType}
                onChange={(e) => setLocFormType(e.target.value as LocationType)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
              >
                <option value="TABLE">Table</option>
                <option value="ROOM">Hotel Room</option>
                <option value="CABIN">Cabin</option>
                <option value="KIOSK">Kiosk</option>
                <option value="PICKUP_COUNTER">Pickup Counter</option>
                <option value="FOOD_TRUCK_WINDOW">Food Truck Window</option>
                <option value="BEACH_POINT">Beach Point</option>
              </select>
            </div>
            <div>
              <label className="text-neutral-300 block mb-1">Fulfillment Method</label>
              <select
                value={locFormFulfillment}
                onChange={(e) => setLocFormFulfillment(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2 text-white"
              >
                <option value="TABLE_SERVICE">Table Service</option>
                <option value="ROOM_SERVICE">Room Service</option>
                <option value="COUNTER_PICKUP">Counter Pickup</option>
                <option value="CURBSIDE">Curbside</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="flex-1 py-2 bg-neutral-800 rounded-xl text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                className="flex-1 py-2 bg-[#E5C378] text-neutral-950 font-bold rounded-xl"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Inspection Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1A15] border border-[#B68A2D]/40 w-full max-w-sm rounded-3xl p-6 font-mono text-xs space-y-4 shadow-2xl text-center">
            <h3 className="font-bold text-white text-base">{qrModalData.locName}</h3>
            <p className="text-neutral-400 text-[11px]">Scan with phone camera to order directly</p>

            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrModalData.qrDataUrl}
                alt="QR Code"
                className="w-56 h-56 mx-auto"
              />
            </div>

            <p className="text-[10px] text-neutral-400 break-all select-all">
              {qrModalData.targetUrl}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setQrModalData(null)}
                className="flex-1 py-2.5 bg-neutral-800 rounded-xl text-neutral-300 font-bold"
              >
                Close
              </button>
              <a
                href={qrModalData.qrDataUrl}
                download={`${qrModalData.locName.replace(/\s+/g, "_")}_QR.png`}
                className="flex-1 py-2.5 bg-[#E5C378] text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save PNG</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <TacticalLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <TacticalTicker />
    </main>
  );
}
