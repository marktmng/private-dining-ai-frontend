import { API_URL } from "./constants";
import type { MenuItem, ParsedOrder } from "@/types/order";

export async function getMenu(): Promise<MenuItem[]> {
  const response = await fetch(`${API_URL}/menu`);

  if (!response.ok) {
    throw new Error("Unable to load menu.");
  }

  return response.json();
}

export async function parseOrder(order: string): Promise<ParsedOrder> {
  const response = await fetch(`${API_URL}/order/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to process order.");
  }

  return response.json();
}
