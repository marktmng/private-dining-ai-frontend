export interface ParsedOrder {
  success: boolean;
  result: string;
}

export type BusinessType =
  | "RESTAURANT"
  | "HOTEL"
  | "CAFE"
  | "ICE_CREAM_SHOP"
  | "FOOD_KIOSK"
  | "FOOD_TRUCK"
  | "TAKEAWAY"
  | "SNACK_SHOP"
  | "OTHER";

export type LocationType =
  | "TABLE"
  | "ROOM"
  | "CABIN"
  | "KIOSK"
  | "PICKUP_COUNTER"
  | "FOOD_TRUCK_WINDOW"
  | "BEACH_POINT"
  | "OTHER";

export type OrderChannel =
  | "QR"
  | "MOBILE"
  | "WEB"
  | "KIOSK"
  | "ROOM_TABLET"
  | "STAFF_POS";

export type FulfillmentMethod =
  | "TABLE_SERVICE"
  | "ROOM_SERVICE"
  | "COUNTER_PICKUP"
  | "CURBSIDE"
  | "DELIVERY";

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "CONFIRMED"
  | "SENT_TO_KITCHEN"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  active: boolean;
  imageUrl?: string | null;
  _count?: {
    items: number;
  };
}

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  active: boolean;
  sortOrder: number;
  options: ModifierOption[];
}

export interface OrderingLocation {
  id: string;
  restaurantId: string;
  name: string;
  code: string;
  type: LocationType;
  active: boolean;
  fulfillmentMethod: FulfillmentMethod;
  description?: string | null;
  qrCodeUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id?: string;
  menuId?: string;
  restaurantId?: string;
  name: string;
  category?: string;
  categoryId?: string | null;
  categoryRelation?: Category | null;
  description?: string;
  price: number;
  active?: boolean;
  preparationTime?: number | null;
  dietaryTags?: string[];
  allergens?: string[];
  imageUrl?: string | null;
  sortOrder?: number;
  modifierGroups?: ModifierGroup[];
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
  businessType?: string;
  currency?: string;
  role: string;
}

export interface CreateOrderItemModifierInput {
  modifierOptionId: string;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
  course?: "STARTER" | "MAIN" | "DESSERT" | "DRINK";
  modifierOptionIds?: string[];
}

export interface CreateOrderPayload {
  tableId?: string;
  roomId?: string;
  locationId?: string;
  locationCode?: string;
  sessionToken?: string;
  orderChannel?: OrderChannel;
  fulfillmentMethod?: FulfillmentMethod;
  status?: string;
  specialInstructions?: string;
  items: CreateOrderItemInput[];
  idempotencyKey?: string;
}

export interface PersistedOrderItemModifier {
  id: string;
  orderItemId: string;
  modifierOptionId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface PersistedOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string | null;
  course?: string | null;
  courseStatus?: "HELD" | "FIRED" | "PREPARING" | "READY";
  menuItem?: MenuItem;
  modifiers?: PersistedOrderItemModifier[];
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  tip: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  providerPaymentId?: string | null;
  isSplit: boolean;
  splitIndex?: number | null;
  splitTotal?: number | null;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedOrder {
  id: string;
  orderNumber?: number;
  restaurantId: string;
  tableId?: string | null;
  roomId?: string | null;
  locationId?: string | null;
  location?: OrderingLocation | null;
  orderChannel?: OrderChannel;
  fulfillmentMethod?: FulfillmentMethod;
  status: OrderStatus;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total: number;
  specialInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PersistedOrderItem[];
  payments?: PaymentRecord[];
  table?: { id: string; name: string } | null;
  room?: { id: string; name: string } | null;
  restaurant?: { name: string; slug?: string; currency?: string } | null;
}

export interface MenuWithItems {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  active: boolean;
  items: MenuItem[];
}

export interface CreateMenuItemPayload {
  name: string;
  category?: string;
  categoryId?: string | null;
  price: number;
  description?: string;
  active?: boolean;
  preparationTime?: number;
  dietaryTags?: string[];
  allergens?: string[];
  imageUrl?: string;
  sortOrder?: number;
}

export interface PublicRestaurantInfo {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  currency: string;
  taxRate: number;
  timezone: string;
  openingHours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  orderingEnabled: boolean;
}

export interface GuestSessionData {
  sessionToken: string;
  restaurantSlug: string;
  locationCode?: string;
  expiresAt: string;
  restaurant: PublicRestaurantInfo;
  location?: OrderingLocation | null;
}

export interface CategorizedPublicMenu {
  restaurant: PublicRestaurantInfo;
  location?: OrderingLocation | null;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder: number;
    items: MenuItem[];
  }>;
  uncategorizedItems?: MenuItem[];
}

export interface AnalyticsOverview {
  period?: string | { start?: any; end?: any; range?: string };
  startDate?: string;
  endDate?: string;
  currency?: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  grossRevenue: number;
  netRevenue: number;
  taxCollected: number;
  tipsCollected: number;
  refundsTotal: number;
  averageOrderValue: number;
  averagePrepTimeMinutes?: number;
  metrics?: Record<string, any>;
}

export interface AnalyticsCharts {
  peakHours?: Array<{ hour: string | number; orderCount?: number; orders?: number; revenue: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  categories?: Array<{ category?: string; name?: string; quantity?: number; revenue: number }>;
  orderChannels: Array<{ channel: string; count: number; orders?: number; revenue?: number }>;
  channels?: Array<{ channel: string; count?: number; orders?: number; revenue?: number }>;
}

export interface AiInsightItem {
  type: "strength" | "opportunity" | "alert" | "recommendation";
  title: string;
  insight: string;
  metric?: string;
}
