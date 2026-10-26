import { API_URL } from "./constants";
import type {
  AnalyticsCharts,
  AnalyticsOverview,
  AiInsightItem,
  AuthUser,
  CategorizedPublicMenu,
  Category,
  CreateMenuItemPayload,
  CreateOrderPayload,
  GuestSessionData,
  MenuItem,
  MenuWithItems,
  ModifierGroup,
  OrderingLocation,
  ParsedOrder,
  PaymentRecord,
  PersistedOrder,
  PublicRestaurantInfo,
} from "@/types/order";

export interface LoginResponse {
  success: boolean;
  token: string;
  data: AuthUser;
  message?: string;
}

export interface MeResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
    };
    restaurant: {
      id: string;
      name: string;
      slug: string;
      businessType?: string;
      description?: string | null;
      logoUrl?: string | null;
      bannerUrl?: string | null;
      currency?: string;
      taxRate?: number;
      timezone?: string;
      openingHours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
      orderingEnabled?: boolean;
    } | null;
    role: string;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
  restaurantName: string;
  businessType?: string;
  currency?: string;
  address?: string;
  phone?: string;
}

// ==========================================
// 1. AUTHENTICATION & BUSINESS PROFILE
// ==========================================

export async function registerVenue(payload: RegisterPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to register venue.");
  }
  return data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Invalid email or password.");
  }
  return data;
}

export async function getMe(token: string): Promise<MeResponse["data"]> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to authenticate session.");
  }
  return data.data;
}

export async function updateRestaurantMe(
  token: string,
  payload: Partial<PublicRestaurantInfo>
): Promise<PublicRestaurantInfo> {
  const response = await fetch(`${API_URL}/restaurant/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update business settings.");
  }
  return data.data;
}

export async function getPublicRestaurant(slug: string): Promise<PublicRestaurantInfo> {
  const response = await fetch(`${API_URL}/restaurant/public/${slug}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Business profile not found.");
  }
  return data.data;
}

// ==========================================
// 2. CATEGORIES MANAGEMENT (Phase 2 Requirement)
// ==========================================

export async function getCategories(token: string): Promise<Category[]> {
  const response = await fetch(`${API_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch categories.");
  }
  return data.data || [];
}

export async function createCategory(
  token: string,
  payload: { name: string; description?: string; sortOrder?: number; imageUrl?: string }
): Promise<Category> {
  const response = await fetch(`${API_URL}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create category.");
  }
  return data.data;
}

export async function updateCategory(
  token: string,
  categoryId: string,
  payload: Partial<{ name: string; description?: string; active: boolean; sortOrder: number; imageUrl?: string }>
): Promise<Category> {
  const response = await fetch(`${API_URL}/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update category.");
  }
  return data.data;
}

export async function deleteCategory(token: string, categoryId: string): Promise<void> {
  const response = await fetch(`${API_URL}/categories/${categoryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete category.");
  }
}

export async function reorderCategories(
  token: string,
  categoryOrders: Array<{ id: string; sortOrder: number }>
): Promise<void> {
  const response = await fetch(`${API_URL}/categories/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ categoryOrders }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to reorder categories.");
  }
}

// ==========================================
// 3. ORDERING LOCATIONS & QR CODE SYSTEM
// ==========================================

export async function getLocations(token: string): Promise<OrderingLocation[]> {
  const response = await fetch(`${API_URL}/locations`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch locations.");
  }
  return data.data || [];
}

export async function createLocation(
  token: string,
  payload: {
    name: string;
    code: string;
    type?: string;
    fulfillmentMethod?: string;
    description?: string;
  }
): Promise<OrderingLocation> {
  const response = await fetch(`${API_URL}/locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create location.");
  }
  return data.data;
}

export async function updateLocation(
  token: string,
  locationId: string,
  payload: Partial<{
    name: string;
    code: string;
    type: string;
    active: boolean;
    fulfillmentMethod: string;
    description?: string;
  }>
): Promise<OrderingLocation> {
  const response = await fetch(`${API_URL}/locations/${locationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update location.");
  }
  return data.data;
}

export async function deleteLocation(token: string, locationId: string): Promise<void> {
  const response = await fetch(`${API_URL}/locations/${locationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete location.");
  }
}

export async function getLocationQr(token: string, locationId: string): Promise<{ qrDataUrl: string; targetUrl: string }> {
  const response = await fetch(`${API_URL}/locations/${locationId}/qr`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to generate QR code.");
  }
  return data.data;
}

export async function getPublicLocation(
  restaurantSlug: string,
  code: string
): Promise<{ restaurant: PublicRestaurantInfo; location: OrderingLocation }> {
  const response = await fetch(`${API_URL}/locations/public/${restaurantSlug}/${code}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Location not found.");
  }
  return data.data;
}

// ==========================================
// 4. MODIFIERS & CUSTOMIZATION
// ==========================================

export async function getModifierGroups(token: string): Promise<ModifierGroup[]> {
  const response = await fetch(`${API_URL}/modifiers/groups`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch modifier groups.");
  }
  return data.data || [];
}

export async function createModifierGroup(
  token: string,
  payload: {
    name: string;
    description?: string;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    options: Array<{ name: string; priceAdjustment: number; isDefault?: boolean }>;
  }
): Promise<ModifierGroup> {
  const response = await fetch(`${API_URL}/modifiers/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create modifier group.");
  }
  return data.data;
}

export async function assignItemModifiers(
  token: string,
  menuItemId: string,
  modifierGroupIds: string[]
): Promise<void> {
  const response = await fetch(`${API_URL}/modifiers/item/${menuItemId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ modifierGroupIds }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to assign modifiers to item.");
  }
}

// ==========================================
// 5. PUBLIC GUEST FLOW & SESSION MANAGEMENT
// ==========================================

export async function initiateGuestSession(
  restaurantSlug: string,
  locationCode?: string
): Promise<GuestSessionData> {
  const response = await fetch(`${API_URL}/guest/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantSlug, locationCode }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to start dining session.");
  }
  return data.data;
}

export async function getPublicCategorizedMenu(
  restaurantSlug: string,
  locationCode?: string
): Promise<CategorizedPublicMenu> {
  const url = locationCode
    ? `${API_URL}/guest/menu/${encodeURIComponent(restaurantSlug)}/${encodeURIComponent(locationCode)}`
    : `${API_URL}/guest/menu/${encodeURIComponent(restaurantSlug)}`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to load restaurant menu.");
  }
  return data.data;
}

export async function submitGuestOrder(
  payload: {
    sessionToken: string;
    orderChannel?: string;
    fulfillmentMethod?: string;
    specialInstructions?: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      notes?: string;
      modifierOptionIds?: string[];
      course?: string;
    }>;
  }
): Promise<PersistedOrder> {
  const response = await fetch(`${API_URL}/guest/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-guest-session": payload.sessionToken,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to submit order.");
  }
  return data.data;
}

export async function getGuestOrder(
  orderId: string,
  sessionToken: string
): Promise<PersistedOrder> {
  const response = await fetch(`${API_URL}/guest/order/${orderId}`, {
    headers: {
      "x-guest-session": sessionToken,
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Order not found.");
  }
  return data.data;
}

export async function trackOrderPublic(orderId: string): Promise<PersistedOrder> {
  const response = await fetch(`${API_URL}/guest/track/${orderId}`, {
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Order not found.");
  }
  return data.data;
}

// ==========================================
// 6. PAYMENTS & SPLIT-BILL INTEGRATION
// ==========================================

export async function createPaymentIntent(
  orderId: string,
  amount: number,
  currency: string = "USD",
  sessionToken?: string
): Promise<{ paymentId: string; clientSecret: string; amount: number; currency: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionToken) headers["x-guest-session"] = sessionToken;

  const response = await fetch(`${API_URL}/payments/intent`, {
    method: "POST",
    headers,
    body: JSON.stringify({ orderId, amount, currency }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to initiate payment.");
  }
  return data.data;
}

export async function confirmPayment(
  paymentId: string,
  providerPaymentId?: string
): Promise<PaymentRecord> {
  const response = await fetch(`${API_URL}/payments/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId, providerPaymentId }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to confirm payment.");
  }
  return data.data;
}

export async function createEqualSplit(
  orderId: string,
  shares: number,
  sessionToken?: string
): Promise<{ orderId: string; total: number; shares: number; perShareAmount: number; payments: PaymentRecord[] }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionToken) headers["x-guest-session"] = sessionToken;

  const response = await fetch(`${API_URL}/payments/split`, {
    method: "POST",
    headers,
    body: JSON.stringify({ orderId, shares }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to calculate split payment.");
  }
  return data.data;
}

export async function getOrderPayments(orderId: string, token?: string): Promise<PaymentRecord[]> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/payments/order/${orderId}`, { headers });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to get order payments.");
  }
  return data.data || [];
}

export async function refundPayment(
  token: string,
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<PaymentRecord> {
  const response = await fetch(`${API_URL}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, reason }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to process refund.");
  }
  return data.data;
}

// ==========================================
// 7. KITCHEN DISPLAY SYSTEM & COURSE PACING
// ==========================================

export async function fireCourse(token: string, orderId: string, course: string): Promise<void> {
  const response = await fetch(`${API_URL}/kds/order/${orderId}/course/${course}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "FIRE" }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fire course.");
  }
}

export async function holdCourse(token: string, orderId: string, course: string): Promise<void> {
  const response = await fetch(`${API_URL}/kds/order/${orderId}/course/${course}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "HOLD" }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to hold course.");
  }
}

// ==========================================
// 8. TENANT ANALYTICS & AI INSIGHTS
// ==========================================

export async function getAnalyticsOverview(token: string, period?: string): Promise<AnalyticsOverview> {
  const p = period || "this_month";
  const url = `${API_URL}/analytics/overview?period=${encodeURIComponent(p)}&range=${encodeURIComponent(p)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch analytics.");
  }

  const raw = data.data || {};
  const metrics = raw.metrics || {};

  return {
    period: typeof raw.period === "string" ? raw.period : (raw.period?.range || p),
    startDate: raw.startDate || raw.period?.start || "",
    endDate: raw.endDate || raw.period?.end || "",
    currency: raw.currency || "USD",
    totalOrders: Number(raw.totalOrders ?? metrics.totalOrders ?? 0),
    completedOrders: Number(raw.completedOrders ?? metrics.completedOrdersCount ?? metrics.completedOrders ?? 0),
    cancelledOrders: Number(raw.cancelledOrders ?? metrics.cancelledOrdersCount ?? metrics.cancelledOrders ?? 0),
    grossRevenue: Number(raw.grossRevenue ?? metrics.grossRevenue ?? 0),
    netRevenue: Number(raw.netRevenue ?? metrics.netRevenue ?? 0),
    taxCollected: Number(raw.taxCollected ?? metrics.totalTax ?? metrics.taxCollected ?? 0),
    tipsCollected: Number(raw.tipsCollected ?? metrics.totalTips ?? metrics.tipsCollected ?? 0),
    refundsTotal: Number(raw.refundsTotal ?? metrics.refundsTotal ?? 0),
    averageOrderValue: Number(raw.averageOrderValue ?? metrics.averageOrderValue ?? 0),
    averagePrepTimeMinutes: Number(raw.averagePrepTimeMinutes ?? metrics.averagePrepTimeMinutes ?? 18),
    metrics,
  };
}

export async function getAnalyticsCharts(token: string, period?: string): Promise<AnalyticsCharts> {
  const p = period || "this_month";
  const url = `${API_URL}/analytics/charts?period=${encodeURIComponent(p)}&range=${encodeURIComponent(p)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load analytics charts.");
  }

  const raw = data.data || {};
  const rawChannels = Array.isArray(raw.orderChannels)
    ? raw.orderChannels
    : Array.isArray(raw.channels)
    ? raw.channels
    : [];

  const normalizedChannels = rawChannels.map((c: any) => ({
    channel: c.channel || "UNKNOWN",
    count: Number(c.count ?? c.orders ?? 0),
    orders: Number(c.orders ?? c.count ?? 0),
    revenue: Number(c.revenue || 0),
  }));

  const rawTopItems = Array.isArray(raw.topItems) ? raw.topItems : [];
  const normalizedTopItems = rawTopItems.map((item: any) => ({
    name: item.name || "Item",
    quantity: Number(item.quantity || 0),
    revenue: Number(item.revenue || 0),
  }));

  return {
    peakHours: Array.isArray(raw.peakHours) ? raw.peakHours : [],
    topItems: normalizedTopItems,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    orderChannels: normalizedChannels,
    channels: normalizedChannels,
  };
}

export async function getAiInsights(token: string, period?: string): Promise<AiInsightItem[]> {
  const p = period || "this_month";
  const url = `${API_URL}/analytics/insights?period=${encodeURIComponent(p)}&range=${encodeURIComponent(p)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load AI insights.");
  }

  if (Array.isArray(data.data?.insights) && data.data.insights.length > 0) {
    return data.data.insights;
  }

  if (typeof data.data?.insightsText === "string" && data.data.insightsText.trim()) {
    const lines = data.data.insightsText
      .split("\n")
      .map((l: string) => l.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);
    const types: Array<"strength" | "opportunity" | "alert" | "recommendation"> = [
      "strength",
      "opportunity",
      "alert",
      "recommendation",
    ];
    return lines.map((line: string, i: number) => {
      const type = types[i % types.length];
      const colon = line.indexOf(":");
      let title = type.charAt(0).toUpperCase() + type.slice(1);
      let insight = line;
      if (colon > 0 && colon < 35) {
        title = line.substring(0, colon).trim();
        insight = line.substring(colon + 1).trim();
      }
      return { type, title, insight };
    });
  }

  return [];
}

export function getExportAnalyticsCsvUrl(token: string, period?: string): string {
  const p = period || "this_month";
  return `${API_URL}/analytics/export?period=${encodeURIComponent(p)}&token=${encodeURIComponent(token)}`;
}

// ==========================================
// 9. PRESERVED ORIGINAL FUNCTIONS
// ==========================================

export async function getMenu(token?: string, restaurantId?: string): Promise<MenuItem[]> {
  if (!token && !restaurantId) return [];

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = restaurantId
    ? `${API_URL}/menu?restaurantId=${encodeURIComponent(restaurantId)}`
    : `${API_URL}/menu`;

  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load menu.");

  const text = await response.text();
  if (!text || !text.trim()) return [];

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: unknown }).data)) {
    const menus = (data as { data: unknown }).data as Array<{
      id: string;
      name: string;
      active: boolean;
      items: Array<{
        id: string;
        menuId: string;
        restaurantId: string;
        name: string;
        category?: string;
        description?: string;
        price: number | string;
        active: boolean;
      }>;
    }>;

    const activeMenus = menus.filter((m) => m.active);
    const flattenedItems: MenuItem[] = [];

    for (const menu of activeMenus) {
      for (const item of menu.items) {
        if (item.active) {
          flattenedItems.push({
            id: item.id,
            menuId: item.menuId,
            restaurantId: item.restaurantId,
            name: item.name,
            category: item.category,
            description: item.description,
            price: Number(item.price),
            active: item.active,
          });
        }
      }
    }
    return flattenedItems;
  }

  if (Array.isArray(data)) {
    return (data as Array<Record<string, unknown>>).map((item) => ({
      id: (item.id as string) || undefined,
      name: (item.name as string) || "",
      category: item.category as string | undefined,
      description: item.description as string | undefined,
      price: Number(item.price) || 0,
      active: item.active !== false,
    }));
  }

  return [];
}

export async function submitOrder(
  payload: CreateOrderPayload,
  token?: string
): Promise<PersistedOrder> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/order`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to submit order.");
  }
  return data.data as PersistedOrder;
}

export async function getOrders(token?: string): Promise<PersistedOrder[]> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/order`, { headers, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to retrieve orders.");
  }
  return (data.data || []) as PersistedOrder[];
}

export async function parseOrder(order: string, token?: string): Promise<ParsedOrder> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/order/parse`, {
    method: "POST",
    headers,
    body: JSON.stringify({ order }),
  });

  if (!response.ok) throw new Error("Unable to process order.");
  return response.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  token?: string,
  reason?: string
): Promise<PersistedOrder> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/order/${orderId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status, reason }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update order status.");
  }
  return data.data as PersistedOrder;
}

export async function getOrderById(orderId: string, token?: string): Promise<PersistedOrder> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/order/${orderId}`, { headers, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Order not found.");
  }
  return data.data as PersistedOrder;
}

export async function getFullMenus(token: string): Promise<MenuWithItems[]> {
  const response = await fetch(`${API_URL}/menu`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load menus.");
  }
  return (data.data || []) as MenuWithItems[];
}

export async function createMenuItem(
  menuId: string,
  payload: CreateMenuItemPayload,
  token: string
): Promise<MenuItem> {
  const response = await fetch(`${API_URL}/menu/${menuId}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create menu item.");
  }
  return data.data as MenuItem;
}

export async function updateMenuItem(
  menuId: string,
  itemId: string,
  payload: Partial<CreateMenuItemPayload>,
  token: string
): Promise<MenuItem> {
  const response = await fetch(`${API_URL}/menu/${menuId}/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update menu item.");
  }
  return data.data as MenuItem;
}

export async function deleteMenuItem(
  menuId: string,
  itemId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_URL}/menu/${menuId}/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete menu item.");
  }
}
