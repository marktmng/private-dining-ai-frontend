import { API_URL } from "./constants";
import type {
  AuthUser,
  CreateMenuItemPayload,
  CreateOrderPayload,
  MenuItem,
  MenuWithItems,
  ParsedOrder,
  PersistedOrder,
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
      description?: string | null;
    } | null;
    role: string;
  };
}

/**
 * Authenticate staff/owner user with credentials.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Invalid email or password.");
  }

  return data;
}

/**
 * Fetch profile and restaurant details for current authenticated session.
 */
export async function getMe(token: string): Promise<MeResponse["data"]> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to authenticate session.");
  }

  return data.data;
}

/**
 * Load restaurant menu.
 * - If token is provided: Loads active items from the authenticated restaurant's database menus.
 * - If token is omitted: Loads legacy prototype menu for backward compatibility.
 */
export async function getMenu(token?: string): Promise<MenuItem[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/menu`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load menu.");
  }

  const text = await response.text();
  if (!text || !text.trim()) {
    return [];
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  // Authenticated response format: { success: true, data: Menu[] }
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

    // Flatten all active items from all active menus
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

  // Legacy prototype menu response format: MenuItem[]
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

/**
 * Submit confirmed order to the backend for validation, authoritative pricing, and persistence.
 */
export async function submitOrder(
  payload: CreateOrderPayload,
  token: string
): Promise<PersistedOrder> {
  const response = await fetch(`${API_URL}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to submit order.");
  }

  return data.data as PersistedOrder;
}

/**
 * Retrieve recent orders for the authenticated restaurant.
 */
export async function getOrders(token: string): Promise<PersistedOrder[]> {
  const response = await fetch(`${API_URL}/order`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to retrieve orders.");
  }

  return (data.data || []) as PersistedOrder[];
}

/**
 * Parse natural language order using AI and menu matching.
 */
export async function parseOrder(order: string, token?: string): Promise<ParsedOrder> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/order/parse`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      order,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to process order.");
  }

  return response.json();
}

/**
 * Update the status of an existing order (e.g. kitchen or manager action).
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  token: string,
  reason?: string
): Promise<PersistedOrder> {
  const response = await fetch(`${API_URL}/order/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, reason }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update order status.");
  }

  return data.data as PersistedOrder;
}

/**
 * Fetch a single order by ID with tenant verification.
 */
export async function getOrderById(
  orderId: string,
  token: string
): Promise<PersistedOrder> {
  const response = await fetch(`${API_URL}/order/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Order not found.");
  }

  return data.data as PersistedOrder;
}

/**
 * Fetch complete menus for the authenticated restaurant (used in Manager Dashboard).
 */
export async function getFullMenus(token: string): Promise<MenuWithItems[]> {
  const response = await fetch(`${API_URL}/menu`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load menus.");
  }

  return (data.data || []) as MenuWithItems[];
}

/**
 * Create a new menu item in a menu (Manager role).
 */
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

/**
 * Update an existing menu item (Manager role).
 */
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

/**
 * Delete a menu item (Manager role).
 */
export async function deleteMenuItem(
  menuId: string,
  itemId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_URL}/menu/${menuId}/items/${itemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete menu item.");
  }
}

