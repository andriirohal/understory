import { getAccessToken } from "./authState";
import { refreshUserTokens } from "./auth";

export const SHOPPING_URL = "https://understory-shopping.up.railway.app";

export function dispatchCartChange(count?: number): void {
  window.dispatchEvent(
    new CustomEvent("cartchange", {
      detail: { count },
    }),
  );
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshOnce(): Promise<string | null> {
  if (localStorage.getItem("hasSession") !== "true") {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshUserTokens().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (localStorage.getItem("hasSession") !== "true") {
    throw new Error("Not authenticated");
  }

  let accessToken = getAccessToken();

  if (!accessToken) {
    accessToken = await refreshOnce();

    if (!accessToken) {
      throw new Error("Not authenticated");
    }
  }

  const makeRequest = (token: string): Promise<Response> => {
    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  };

  let response = await makeRequest(accessToken);

  if (response.status !== 401) {
    return response;
  }

  const newAccessToken = await refreshOnce();

  if (!newAccessToken) {
    throw new Error("Unauthorized");
  }

  response = await makeRequest(newAccessToken);

  return response;
}

export async function getResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const result = await response.json();

    if (result && typeof result.error === "string") {
      return result.error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export async function getCart() {
  const response = await authenticatedFetch(`${SHOPPING_URL}/cart`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response, "Failed to get cart"));
  }

  return response.json();
}

async function refreshCartCount(): Promise<void> {
  if (localStorage.getItem("hasSession") !== "true") {
    dispatchCartChange(0);
    return;
  }

  try {
    const cart = await getCart();

    const items = Array.isArray(cart.data?.items) ? cart.data.items : [];

    const count = items.reduce(
      (
        total: number,
        item: {
          quantity: number;
        },
      ) => total + Number(item.quantity),
      0,
    );

    dispatchCartChange(count);
  } catch (error) {
    console.error("Failed to refresh cart count:", error);
  }
}

export async function addToCart(plantId: string, quantity: number) {
  const response = await authenticatedFetch(`${SHOPPING_URL}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plantId,
      quantity,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getResponseError(response, "Failed to add item to cart"),
    );
  }

  const data = await response.json();

  await refreshCartCount();

  return data;
}

export async function updateCart(plantId: string, quantity: number) {
  const response = await authenticatedFetch(`${SHOPPING_URL}/cart`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plantId,
      quantity,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getResponseError(response, "Failed to update cart item"),
    );
  }

  const data = await response.json();

  await refreshCartCount();

  return data;
}

export async function removeFromCart(plantId: string) {
  const response = await authenticatedFetch(`${SHOPPING_URL}/cart/${plantId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getResponseError(response, "Failed to remove item from cart"),
    );
  }

  const data = await response.json();

  await refreshCartCount();

  return data;
}
