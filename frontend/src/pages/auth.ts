import {
  getCurrentUser,
  getUserSummary,
  handleLogInSubmit,
  handleLogOut,
  handleSignUpSubmit,
  UserSummary,
} from "../api";

import { getLanguage, t } from "../i18n";

import { setButtonLoading } from "../utils";

interface AuthField {
  id: "name" | "email" | "password";
  label: string;
  type: "text" | "email" | "password";
  placeholder: string;
  autocomplete: string;
  minlength?: number;
}

type AccountMode = "login" | "signup";

let summaryPromise: Promise<void> | null = null;
let summaryUserId: string | null = null;
let accountSummary: UserSummary | null = null;
let summaryRequestId = 0;

const SUMMARY_CACHE_PREFIX = "account-summary:";

function readCachedSummary(userId: string): UserSummary | null {
  try {
    const raw = localStorage.getItem(SUMMARY_CACHE_PREFIX + userId);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as UserSummary;
  } catch {
    return null;
  }
}

function writeCachedSummary(userId: string, summary: UserSummary): void {
  try {
    localStorage.setItem(
      SUMMARY_CACHE_PREFIX + userId,
      JSON.stringify(summary),
    );
  } catch {}
}

function clearCachedSummary(userId: string): void {
  try {
    localStorage.removeItem(SUMMARY_CACHE_PREFIX + userId);
  } catch {}
}

function invalidateAccountSummary(): void {
  summaryRequestId++;
  summaryPromise = null;
}

export async function refreshAccountSummary(): Promise<void> {
  const user = getCurrentUser();

  if (!user) {
    summaryRequestId++;
    summaryPromise = null;
    summaryUserId = null;
    accountSummary = null;

    return;
  }

  await loadAccountSummary(user.id, true);
}

function getLoginFields(): AuthField[] {
  return [
    {
      id: "email",
      label: t("auth.email"),
      type: "email",
      placeholder: t("auth.emailPlaceholder"),
      autocomplete: "email",
    },
    {
      id: "password",
      label: t("auth.password"),
      type: "password",
      placeholder: t("auth.passwordPlaceholder"),
      autocomplete: "current-password",
    },
  ];
}

function getSignupFields(): AuthField[] {
  return [
    {
      id: "name",
      label: t("auth.name"),
      type: "text",
      placeholder: t("auth.namePlaceholder"),
      autocomplete: "name",
    },
    {
      id: "email",
      label: t("auth.email"),
      type: "email",
      placeholder: t("auth.emailPlaceholder"),
      autocomplete: "email",
    },
    {
      id: "password",
      label: t("auth.password"),
      type: "password",
      placeholder: t("auth.passwordPlaceholder"),
      autocomplete: "new-password",
      minlength: 8,
    },
  ];
}

function renderField(field: AuthField, prefix?: string): string {
  const id = prefix ? `${prefix}-${field.id}` : field.id;

  const minlength =
    field.minlength !== undefined ? `minlength="${field.minlength}"` : "";

  return `
    <div class="auth_field">
      <label for="${id}">
        ${field.label}
      </label>

      <input
        id="${id}"
        name="${field.id}"
        type="${field.type}"
        placeholder="${field.placeholder}"
        autocomplete="${field.autocomplete}"
        ${minlength}
        required
      />
    </div>
  `;
}

function setAccountMode(mode: AccountMode): void {
  const forms = document.querySelectorAll<HTMLElement>("[data-account-form]");

  const tabs =
    document.querySelectorAll<HTMLButtonElement>("[data-account-tab]");

  forms.forEach((form) => {
    const active = form.dataset.accountForm === mode;

    form.classList.toggle("active", active);

    form.inert = !active;

    form.setAttribute("aria-hidden", String(!active));
  });

  tabs.forEach((tab) => {
    const active = tab.dataset.accountTab === mode;

    tab.classList.toggle("active", active);

    tab.setAttribute("aria-selected", String(active));

    tab.tabIndex = active ? 0 : -1;
  });
}

export function renderLogin(): string {
  return `
    <main class="auth_page">
      <section class="auth_hero container">
        <div class="auth_card">

          <div class="eyebrow">
            ${t("header.accountPopover.account")}
          </div>

          <h1>
            ${t("auth.welcomeBack")}
          </h1>

          <p class="auth_intro">
            ${t("auth.loginIntro")}
          </p>

          <form
            class="auth_form"
            data-form="login"
            novalidate
          >
            ${getLoginFields()
              .map((field) => renderField(field))
              .join("")}

            <p
              class="auth_error"
              data-login-error
              role="alert"
              aria-live="polite"
            ></p>

            <button
              type="submit"
              class="btn auth_submit"
            >
              ${t("auth.login")}
            </button>
          </form>

          <p class="auth_switch">
            ${t("auth.newToUnderstory")}

            <a
              href="/signup"
              data-router-link
            >
              ${t("auth.signUp")}
            </a>
          </p>

        </div>
      </section>
    </main>
  `;
}

export function renderSignup(): string {
  return `
    <main class="auth_page">
      <section class="auth_hero container">
        <div class="auth_card">

          <div class="eyebrow">
            ${t("header.accountPopover.account")}
          </div>

          <h1>
            ${t("auth.signUp")}
          </h1>

          <p class="auth_intro">
            ${t("auth.signupIntro")}
          </p>

          <form
            class="auth_form"
            data-form="signup"
            novalidate
          >
            ${getSignupFields()
              .map((field) => renderField(field))
              .join("")}

            <p class="auth_hint">
              ${t("auth.signupHint")}
            </p>

            <p
              class="auth_error"
              data-signup-error
              role="alert"
              aria-live="polite"
            ></p>

            <button
              type="submit"
              class="btn auth_submit"
            >
              ${t("auth.signUp")}
            </button>
          </form>

          <p class="auth_switch">
            ${t("auth.alreadyHaveAccount")}

            <a
              href="/login"
              data-router-link
            >
              ${t("auth.login")}
            </a>
          </p>

        </div>
      </section>
    </main>
  `;
}

export function renderAccount(): string {
  const user = getCurrentUser();

  const summary =
    user && accountSummary && summaryUserId === user.id ? accountSummary : null;

  const initialOrders =
    summary?.totalOrders !== undefined ? summary.totalOrders : "";

  const initialPlants =
    summary?.totalPlants !== undefined ? summary.totalPlants : "";

  const initialLoyalty = summary ? getLoyaltyLevel(summary.totalOrders) : "";

  const initialLastOrder = summary
    ? formatAccountDate(summary.lastOrderDate)
    : "";

  return `
    <div
      class="account_popover_overlay"
      data-account-overlay
      aria-hidden="true"
    >
      <div
        class="account_popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accountPopoverTitle"
      >

        <section
          class="account_auth"
          data-account-auth
        >

          <div class="account_popover_header">
            <div class="account_popover_heading">

              <div class="account_eyebrow">
                Understory /
                ${t("header.accountPopover.account")}
              </div>

              <h2
                id="accountPopoverTitle"
                class="account_title"
              >
                ${t("header.accountPopover.title")}
              </h2>

            </div>

            <button
              type="button"
              class="account_popover_close"
              data-account-close
              aria-label="${t("header.accountPopover.close")}"
            >
              <span
                class="account_close_icon"
                aria-hidden="true"
              ></span>
            </button>
          </div>

          <div
            class="account_tabs"
            role="tablist"
            aria-label="${t("header.accountPopover.accountAuthentication")}"
          >
            <button
              type="button"
              class="account_tab active"
              data-account-tab="login"
              role="tab"
              aria-selected="true"
              aria-controls="account-login-form"
              tabindex="0"
            >
              ${t("auth.login")}
            </button>

            <button
              type="button"
              class="account_tab"
              data-account-tab="signup"
              role="tab"
              aria-selected="false"
              aria-controls="account-signup-form"
              tabindex="-1"
            >
              ${t("auth.signUp")}
            </button>
          </div>

          <form
            id="account-login-form"
            class="account_form active"
            data-account-form="login"
            aria-hidden="false"
            novalidate
          >
            ${getLoginFields()
              .map((field) => renderField(field, "account-login"))
              .join("")}

            <p
              class="auth_error"
              data-account-login-error
              role="alert"
              aria-live="polite"
            ></p>

            <button
              type="submit"
              class="btn account_submit"
            >
              ${t("auth.login")}
            </button>

            <p class="account_switch">
              ${t("auth.newToUnderstory")}

              <button
                type="button"
                data-switch-account="signup"
              >
                ${t("auth.signUp")}
              </button>
            </p>
          </form>

          <form
            id="account-signup-form"
            class="account_form"
            data-account-form="signup"
            aria-hidden="true"
            novalidate
            inert
          >
            ${getSignupFields()
              .map((field) => renderField(field, "account-signup"))
              .join("")}

            <p class="account_hint">
              ${t("auth.signupHintShort")}
            </p>

            <p
              class="auth_error"
              data-account-signup-error
              role="alert"
              aria-live="polite"
            ></p>

            <button
              type="submit"
              class="btn account_submit"
            >
              ${t("auth.signUp")}
            </button>

            <p class="account_switch">
              ${t("auth.alreadyHaveAccount")}

              <button
                type="button"
                data-switch-account="login"
              >
                ${t("auth.login")}
              </button>
            </p>
          </form>

        </section>

        <section
          class="account_welcome"
          data-account-welcome
          inert
        >

          <div class="account_popover_header">

            <div class="account_popover_heading">

              <div class="account_eyebrow">
                Understory /
                ${t("header.accountPopover.account")}
              </div>

              <div class="account_header">

                <div
                  class="account_avatar"
                  data-account-avatar
                  aria-hidden="true"
                >
                  U
                </div>

                <div class="account_identity">

                  <h2 class="account_title">

                    <span>
                      ${t("header.accountPopover.welcome")},
                    </span>

                    <span
                      class="account_name"
                      data-account-name
                    >
                      —
                    </span>

                  </h2>

                  <p data-account-email>
                    —
                  </p>

                </div>

              </div>

            </div>

            <button
              type="button"
              class="account_popover_close"
              data-account-close
              aria-label="${t("header.accountPopover.close")}"
            >
              <span
                class="account_close_icon"
              ></span>
            </button>

          </div>

          <div class="account_stats">

            <div class="account_stat">
              <span
                class="account_stat_number"
                data-account-orders
              >
                ${initialOrders}
              </span>

              <span class="account_stat_label">
                ${t("header.accountPopover.orders")}
              </span>
            </div>

            <div class="account_stat">
              <span
                class="account_stat_number"
                data-account-plants
              >
                ${initialPlants}
              </span>

              <span class="account_stat_label">
                ${t("header.accountPopover.plants")}
              </span>
            </div>

          </div>

          <div class="account_meta">

            <div class="account_meta_row">
              <span>
                ${t("header.accountPopover.since")}
              </span>

              <span data-account-since>
                —
              </span>
            </div>

            <div class="account_meta_row">
              <span>
                ${t("header.accountPopover.loyalty")}
              </span>

              <span data-account-loyalty>
                ${initialLoyalty}
              </span>
            </div>

            <div class="account_meta_row">
              <span>
                ${t("header.accountPopover.last")}
              </span>

              <span data-account-last-order>
                ${initialLastOrder}
              </span>
            </div>

          </div>

          <button
            type="button"
            class="account_logout"
            data-account-logout
          >
            ${t("header.accountPopover.logout")}
          </button>

        </section>

      </div>
    </div>
  `;
}

function getLoyaltyLevel(orderCount: number): string {
  if (orderCount >= 10) {
    return t("header.accountPopover.loyaltyBotanist");
  }

  if (orderCount >= 6) {
    return t("header.accountPopover.loyaltyCultivator");
  }

  if (orderCount >= 3) {
    return t("header.accountPopover.loyaltyGrower");
  }

  if (orderCount >= 1) {
    return t("header.accountPopover.loyaltySeedling");
  }

  return t("header.accountPopover.loyaltyNewcomer");
}

function formatAccountDate(value: string | Date | null): string {
  if (!value) {
    return t("header.accountPopover.noOrders");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return t("header.accountPopover.noOrders");
  }

  const localeMap = {
    en: "en-US",
    ua: "uk-UA",
    de: "de-DE",
    pl: "pl-PL",
  } as const;

  const locale = localeMap[getLanguage()] ?? "en-US";

  return date.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function updateAccountStats(summary: UserSummary): void {
  const orders = document.querySelector<HTMLElement>("[data-account-orders]");

  const plants = document.querySelector<HTMLElement>("[data-account-plants]");

  const loyalty = document.querySelector<HTMLElement>("[data-account-loyalty]");

  const lastOrder = document.querySelector<HTMLElement>(
    "[data-account-last-order]",
  );

  if (orders) {
    orders.textContent = String(summary.totalOrders);
  }

  if (plants) {
    plants.textContent = String(summary.totalPlants);
  }

  if (loyalty) {
    loyalty.textContent = getLoyaltyLevel(summary.totalOrders);
  }

  if (lastOrder) {
    lastOrder.textContent = formatAccountDate(summary.lastOrderDate);
  }
}

function handleAuthSubmit(event: SubmitEvent): void {
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const isLogin = form.matches(
    '[data-form="login"], [data-account-form="login"]',
  );

  const isSignup = form.matches(
    '[data-form="signup"], [data-account-form="signup"]',
  );

  if (!isLogin && !isSignup) {
    return;
  }

  event.preventDefault();

  if (form.dataset.submitting === "true") {
    return;
  }

  const submitButton = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );

  if (!submitButton) {
    return;
  }

  form.dataset.submitting = "true";

  submitButton.setAttribute("aria-disabled", "true");

  setButtonLoading(submitButton, true);

  const request = isLogin
    ? handleLogInSubmit(event)
    : handleSignUpSubmit(event);

  void request
    .then(async (success) => {
      if (!success) {
        return;
      }

      invalidateAccountSummary();

      const user = getCurrentUser();

      if (user) {
        await loadAccountSummary(user.id, true);
      }

      updateAccountUI();
    })
    .catch((error) => {
      console.error("AUTH SUBMIT ERROR:", error);
    })
    .finally(() => {
      if (!document.body.contains(form)) {
        return;
      }

      form.dataset.submitting = "false";

      submitButton.removeAttribute("aria-disabled");

      setButtonLoading(submitButton, false);
    });
}

export function initAuthForms(): void {
  const root = document.documentElement;

  if (root.dataset.authFormsInitialized === "true") {
    return;
  }

  root.dataset.authFormsInitialized = "true";

  document.addEventListener("submit", handleAuthSubmit);
}

export function initAccountActions(): void {
  const root = document.documentElement;

  if (root.dataset.accountActionsInitialized === "true") {
    return;
  }

  root.dataset.accountActionsInitialized = "true";

  document.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const logoutButton = target.closest<HTMLButtonElement>(
      "[data-account-logout]",
    );

    if (logoutButton) {
      event.preventDefault();
      event.stopPropagation();

      if (logoutButton.disabled) {
        return;
      }

      const loggedOutUserId = getCurrentUser()?.id ?? null;

      setButtonLoading(logoutButton, true);

      try {
        await handleLogOut();
      } finally {
        if (loggedOutUserId) {
          clearCachedSummary(loggedOutUserId);
        }

        summaryRequestId++;
        summaryPromise = null;
        summaryUserId = null;
        accountSummary = null;

        setButtonLoading(logoutButton, false);

        closeAccountPopover();

        updateAccountUI();
      }

      return;
    }

    const switchButton = target.closest<HTMLButtonElement>(
      "[data-switch-account]",
    );

    if (switchButton) {
      event.preventDefault();
      event.stopPropagation();

      const mode = switchButton.dataset.switchAccount;

      if (mode === "login" || mode === "signup") {
        setAccountMode(mode);
      }

      return;
    }

    const accountTab = target.closest<HTMLButtonElement>("[data-account-tab]");

    if (accountTab) {
      event.preventDefault();
      event.stopPropagation();

      const mode = accountTab.dataset.accountTab;

      if (mode === "login" || mode === "signup") {
        setAccountMode(mode);
      }
    }
  });
}

function closeAccountPopover(): void {
  const overlay = document.querySelector<HTMLElement>("[data-account-overlay]");

  if (!overlay) {
    return;
  }

  overlay.classList.remove("active");

  overlay.setAttribute("aria-hidden", "true");

  document.body.classList.remove("account-open");
}

export function initAccountPopover(root: HTMLElement): void {
  const overlay = root.querySelector<HTMLElement>("[data-account-overlay]");

  const openButton = root.querySelector<HTMLElement>("[data-account-open]");

  const closeButtons = root.querySelectorAll<HTMLButtonElement>(
    "[data-account-close]",
  );

  if (!overlay) {
    return;
  }

  const openAccount = (): void => {
    updateAccountUI();

    overlay.classList.add("active");

    overlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("account-open");

    const user = getCurrentUser();

    if (user) {
      void loadAccountSummary(user.id, false);
    }
  };

  openButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    openAccount();
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      closeAccountPopover();
    });
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeAccountPopover();
    }
  });

  window.addEventListener("auth-open", openAccount);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("active")) {
      closeAccountPopover();
    }
  });
}

export function updateAccountUI(): void {
  const user = getCurrentUser();

  const auth = document.querySelector<HTMLElement>("[data-account-auth]");

  const welcome = document.querySelector<HTMLElement>("[data-account-welcome]");

  const name = document.querySelector<HTMLElement>("[data-account-name]");

  const email = document.querySelector<HTMLElement>("[data-account-email]");

  const avatar = document.querySelector<HTMLElement>("[data-account-avatar]");

  const since = document.querySelector<HTMLElement>("[data-account-since]");

  if (!auth || !welcome || !name || !email || !avatar || !since) {
    return;
  }

  if (!user) {
    welcome.inert = true;
    welcome.classList.remove("active");

    auth.inert = false;
    auth.classList.add("active");

    return;
  }

  auth.inert = true;
  auth.classList.remove("active");

  welcome.inert = false;
  welcome.classList.add("active");

  name.textContent = user.name;
  email.textContent = user.email;

  avatar.textContent = user.name.trim().charAt(0).toUpperCase();

  const date = new Date(user.createdAt);

  const localeMap = {
    en: "en-US",
    ua: "uk-UA",
    de: "de-DE",
    pl: "pl-PL",
  } as const;

  const locale = localeMap[getLanguage()] ?? "en-US";

  since.textContent = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });

  if (accountSummary && summaryUserId === user.id) {
    updateAccountStats(accountSummary);
  }
}

async function loadAccountSummary(
  userId: string,
  forceRefresh = false,
): Promise<void> {
  if (!forceRefresh && summaryUserId === userId && summaryPromise) {
    await summaryPromise;
    return;
  }

  if (!accountSummary || summaryUserId !== userId) {
    const cachedSummary = readCachedSummary(userId);

    if (cachedSummary) {
      accountSummary = cachedSummary;

      summaryUserId = userId;

      updateAccountStats(cachedSummary);
    }
  }

  if (!forceRefresh && summaryUserId === userId && summaryPromise) {
    await summaryPromise;
    return;
  }

  const requestId = ++summaryRequestId;

  summaryUserId = userId;

  const request = getUserSummary()
    .then((summary) => {
      if (requestId !== summaryRequestId) {
        return;
      }

      if (getCurrentUser()?.id !== userId) {
        return;
      }

      accountSummary = summary;

      summaryUserId = userId;

      writeCachedSummary(userId, summary);

      updateAccountStats(summary);
    })
    .catch((error) => {
      if (requestId !== summaryRequestId) {
        return;
      }

      console.error("ACCOUNT SUMMARY ERROR:", error);
    })
    .finally(() => {
      if (requestId === summaryRequestId) {
        summaryPromise = null;
      }
    });

  summaryPromise = request;

  await request;
}

function refreshAccountLanguage(): void {
  const overlay = document.querySelector<HTMLElement>("[data-account-overlay]");

  if (!overlay) {
    return;
  }

  const wasOpen = overlay.classList.contains("active");

  const accountRoot = overlay.parentElement;

  if (!accountRoot) {
    return;
  }

  accountRoot.innerHTML = renderAccount();

  initAccountPopover(accountRoot);

  updateAccountUI();

  if (wasOpen) {
    const newOverlay = accountRoot.querySelector<HTMLElement>(
      "[data-account-overlay]",
    );

    if (newOverlay) {
      newOverlay.classList.add("active");

      newOverlay.setAttribute("aria-hidden", "false");

      document.body.classList.add("account-open");
    }
  }
}

export function initAccountUI(): void {
  const root = document.documentElement;

  if (root.dataset.accountUIInitialized === "true") {
    return;
  }

  root.dataset.accountUIInitialized = "true";

  updateAccountUI();

  window.addEventListener("auth-changed", () => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      invalidateAccountSummary();

      summaryUserId = null;
      accountSummary = null;

      closeAccountPopover();
      updateAccountUI();

      return;
    }

    invalidateAccountSummary();

    void loadAccountSummary(currentUser.id, true).then(() => {
      updateAccountUI();
    });
  });

  window.addEventListener("language-changed", refreshAccountLanguage);

  window.addEventListener("order-changed", () => {
    void refreshAccountSummary();
  });
}
