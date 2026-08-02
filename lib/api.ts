import { API_URL } from "./constants";

export async function getMenu() {
  const response = await fetch(`${API_URL}/menu`);

  if (!response.ok) {
    throw new Error("Unable to load menu.");
  }

  return response.json();
}

export async function parseOrder(order: string) {
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