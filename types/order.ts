export interface ParsedOrder {
  success: boolean;
  result: string;
}

export interface MenuItem {
  id?: string;
  menuId?: string;
  restaurantId?: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  active?: boolean;
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  restaurantId: string;
  restaurantName?: string;
  role: string;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderPayload {
  tableId?: string;
  roomId?: string;
  specialInstructions?: string;
  items: CreateOrderItemInput[];
  idempotencyKey?: string;
}

export interface PersistedOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string | null;
  menuItem?: MenuItem;
}

export interface PersistedOrder {
  id: string;
  restaurantId: string;
  tableId?: string | null;
  roomId?: string | null;
  status: "PENDING" | "CONFIRMED" | "SENT_TO_KITCHEN" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  total: number;
  specialInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PersistedOrderItem[];
  table?: { id: string; name: string } | null;
  room?: { id: string; name: string } | null;
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
  category: string;
  price: number;
  description?: string;
  active?: boolean;
}

