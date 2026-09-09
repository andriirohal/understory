import { getAccessToken } from "./authState";
import { SHOPPING_URL } from "./cart";

export async function getErrorMessage(response: Response): Promise<string> {
  try {
    const result = await response.json();

    if (result && typeof result.error === "string") {
      return result.error;
    }
  } catch {
    return "";
  }

  return "";
}

export async function getOrder(orderId: string) {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${SHOPPING_URL}/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);

    throw new Error(message || "Failed to get order");
  }

  return response.json();
}

export async function addOrder() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${SHOPPING_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);

    throw new Error(message || "Failed to add order");
  }

  const order = await response.json();

  window.dispatchEvent(
    new CustomEvent("cartchange", {
      detail: {
        count: 0,
      },
    }),
  );

  return order;
}
