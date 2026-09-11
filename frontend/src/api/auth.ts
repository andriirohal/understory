import {
  clearAccessToken,
  clearCurrentUser,
  getAccessToken,
  setAccessToken,
  setCurrentUser,
  CurrentUser,
} from "./authState";

import { t } from "../i18n";

const AUTH_URL = "https://understory-auth.up.railway.app";

let isLoggingIn = false;
let isSigningUp = false;

let refreshPromise: Promise<string | null> | null = null;

let authPromise: Promise<CurrentUser | null> | null = null;

export interface UserSummary {
  totalOrders: number;
  totalPlants: number;
  lastOrderDate: string | null;
}

function dispatchCartChange(count?: number): void {
  window.dispatchEvent(
    new CustomEvent("cartchange", {
      detail: { count },
    }),
  );
}

function dispatchAuthChanged(): void {
  window.dispatchEvent(new Event("auth-changed"));
}

function clearSession(): void {
  clearAccessToken();
  clearCurrentUser();

  localStorage.removeItem("hasSession");

  dispatchCartChange();
  dispatchAuthChanged();
}

function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    "We couldn't find an account with this email address": "auth.errors.emailError",

    "We couldn't verify your password": "auth.errors.passwordError",

    "Name must be 20 characters or less": "auth.errors.nameMaxLength",

    "Please enter a valid email address": "auth.errors.invalidEmail",

    "Password must be 8–100 characters": "auth.errors.passwordLength",

    "An account with this email address already exists":
      "auth.errors.emailAlreadyExists",
  };

  const messageKey = message.trim();

  const translationKey = errorMap[messageKey];

  return translationKey ? t(translationKey) : messageKey;
}

async function getErrorMessage(response: Response): Promise<string> {
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

async function getResponseError(
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

export async function signUp(data: {
  name: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${AUTH_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);

    throw new Error(message || "Sign up failed");
  }

  return response.json();
}

export async function logIn(data: { email: string; password: string }) {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);

    throw new Error(message || "Log in failed");
  }

  return response.json();
}

export async function logOut(): Promise<void> {
  const response = await fetch(`${AUTH_URL}/logout`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await getErrorMessage(response);

    throw new Error(message || "Log out failed");
  }
}

export async function handleLogOut(): Promise<void> {
  try {
    await logOut();
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    clearSession();
  }
}

export async function handleLogInSubmit(event: SubmitEvent): Promise<boolean> {
  event.preventDefault();

  if (isLoggingIn) {
    return false;
  }

  isLoggingIn = true;

  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    isLoggingIn = false;
    return false;
  }

  const submitButton = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );

  const errorElement = form.querySelector<HTMLElement>(
    "[data-login-error], [data-account-login-error]",
  );

  if (submitButton) {
    submitButton.disabled = true;
  }

  if (errorElement) {
    errorElement.textContent = "";
  }

  const formData = new FormData(form);

  const email = String(formData.get("email") ?? "");

  const password = String(formData.get("password") ?? "");

  try {
    const result = await logIn({
      email,
      password,
    });

    if (!result || typeof result.accessToken !== "string") {
      throw new Error("Invalid login response");
    }

    setAccessToken(result.accessToken);

    setCurrentUser({
      id: result.userId,
      name: result.name,
      email: result.email,
      createdAt: result.createdAt,
    });

    localStorage.setItem("hasSession", "true");

    dispatchCartChange();
    dispatchAuthChanged();

    return true;
  } catch (error) {
    if (errorElement && error instanceof Error) {
      errorElement.textContent = translateAuthError(error.message);
    }

    return false;
  } finally {
    isLoggingIn = false;

    submitButton?.removeAttribute("disabled");
  }
}

export async function handleSignUpSubmit(event: SubmitEvent): Promise<boolean> {
  event.preventDefault();

  if (isSigningUp) {
    return false;
  }

  isSigningUp = true;

  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    isSigningUp = false;
    return false;
  }

  const submitButton = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );

  const errorElement = form.querySelector<HTMLElement>(
    "[data-signup-error], [data-account-signup-error]",
  );

  if (submitButton) {
    submitButton.disabled = true;
  }

  if (errorElement) {
    errorElement.textContent = "";
  }

  const formData = new FormData(form);

  const name = String(formData.get("name") ?? "");

  const email = String(formData.get("email") ?? "");

  const password = String(formData.get("password") ?? "");

  try {
    const result = await signUp({
      name,
      email,
      password,
    });

    if (!result || typeof result.accessToken !== "string") {
      throw new Error("Invalid sign up response");
    }

    setAccessToken(result.accessToken);

    setCurrentUser({
      id: result.userId,
      name: result.name,
      email: result.email,
      createdAt: result.createdAt,
    });

    localStorage.setItem("hasSession", "true");

    dispatchCartChange();
    dispatchAuthChanged();

    return true;
  } catch (error) {
    if (errorElement && error instanceof Error) {
      errorElement.textContent = translateAuthError(error.message);
    }

    return false;
  } finally {
    isSigningUp = false;

    submitButton?.removeAttribute("disabled");
  }
}

export function refreshUserTokens(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${AUTH_URL}/refresh`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (!result || typeof result.accessToken !== "string") {
        return null;
      }

      setAccessToken(result.accessToken);

      return result.accessToken;
    } catch (error) {
      console.error("Refresh request failed:", error);

      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function getProfile(token: string): Promise<Response> {
  return fetch(`${AUTH_URL}/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    cache: "no-store",
  });
}

export function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    try {
      if (localStorage.getItem("hasSession") !== "true") {
        return null;
      }

      let token = getAccessToken();

      if (!token) {
        token = await refreshUserTokens();

        if (!token) {
          clearSession();
          return null;
        }
      }

      let response = await getProfile(token);

      if (response.status === 401) {
        const newAccessToken = await refreshUserTokens();

        if (!newAccessToken) {
          clearSession();
          return null;
        }

        response = await getProfile(newAccessToken);
      }

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (!result || typeof result.userId !== "string") {
        clearSession();
        return null;
      }

      const user: CurrentUser = {
        id: result.userId,
        name: result.name,
        email: result.email,
        createdAt: result.createdAt,
      };

      setCurrentUser(user);

      return user;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

export async function getUserSummary(): Promise<UserSummary> {
  let token = getAccessToken();

  if (!token) {
    token = await refreshUserTokens();
  }

  if (!token) {
    throw new Error("Not authenticated");
  }

  let response = await fetch(`${AUTH_URL}/profile/summary`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    const newAccessToken = await refreshUserTokens();

    if (!newAccessToken) {
      clearSession();

      throw new Error("Not authenticated");
    }

    response = await fetch(`${AUTH_URL}/profile/summary`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
      },
      credentials: "include",
      cache: "no-store",
    });
  }

  if (!response.ok) {
    const message = await getResponseError(
      response,
      "Failed to get user summary",
    );

    throw new Error(message);
  }

  return response.json();
}
