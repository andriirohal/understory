import {
  handleLogInSubmit,
  getCurrentUser,
  handleSignUpSubmit,
  handleLogOut,
} from "../api";

import { renderLogin, renderSignup } from "./auth";

import { getLanguage, t } from "../i18n";

interface StaticContent {
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
}

const Content: Record<string, StaticContent> = {
  care: {
    eyebrow: "static.care.eyebrow",
    title: "static.care.title",
    intro: "static.care.intro",
    body: ["static.care.body1", "static.care.body2", "static.care.body3"],
  },

  about: {
    eyebrow: "static.about.eyebrow",
    title: "static.about.title",
    intro: "static.about.intro",
    body: ["static.about.body1", "static.about.body2", "static.about.body3"],
  },

  guarantee: {
    eyebrow: "static.guarantee.eyebrow",
    title: "static.guarantee.title",
    intro: "static.guarantee.intro",
    body: [
      "static.guarantee.body1",
      "static.guarantee.body2",
      "static.guarantee.body3",
    ],
  },

  shipping: {
    eyebrow: "static.shipping.eyebrow",
    title: "static.shipping.title",
    intro: "static.shipping.intro",
    body: [
      "static.shipping.body1",
      "static.shipping.body2",
      "static.shipping.body3",
    ],
  },

  contact: {
    eyebrow: "static.contact.eyebrow",
    title: "static.contact.title",
    intro: "static.contact.intro",
    body: ["static.contact.body1", "static.contact.body2"],
  },
};

let accountPopoverInitialized = false;
let accountAuthInitialized = false;
let authFormsInitialized = false;
let accountActionsInitialized = false;
let accountUIInitialized = false;

export function renderStatic(key: string): string {
  if (key === "login") {
    return renderLogin();
  }

  if (key === "signup") {
    return renderSignup();
  }

  const content = Content[key];

  if (!content) {
    return "";
  }

  return `
    <main class="static_page">

      <section class="static_hero container">

        <div class="static_hero_content">

          <div class="eyebrow">
            ${t(content.eyebrow)}
          </div>

          <h1>
            ${t(content.title)}
          </h1>

          <p class="static_hero_intro">
            ${t(content.intro)}
          </p>

        </div>

      </section>

      <section class="static_content container">

        <div class="static_content_inner">

          ${content.body
            .map(
              (paragraph, index) => `
                <div class="static_paragraph">

                  <span class="static_paragraph_number">
                    ${String(index + 1).padStart(2, "0")}
                  </span>

                  <p>
                    ${t(paragraph)}
                  </p>

                </div>
              `,
            )
            .join("")}

        </div>

      </section>

    </main>
  `;
}

function getAccountOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-account-overlay]");
}

function openAccountPopover(): void {
  const overlay = getAccountOverlay();

  if (!overlay) {
    return;
  }

  updateAccountUI();

  overlay.classList.add("open");

  overlay.setAttribute("aria-hidden", "false");
}

function closeAccountPopover(): void {
  const overlay = getAccountOverlay();

  if (!overlay) {
    return;
  }

  overlay.classList.remove("open");

  overlay.setAttribute("aria-hidden", "true");
}

export function initAccountPopover(_root: HTMLElement): void {
  if (accountPopoverInitialized) {
    return;
  }

  accountPopoverInitialized = true;

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const openButton = target.closest("[data-account-open]");

    if (openButton) {
      event.preventDefault();

      openAccountPopover();

      return;
    }

    const closeButton = target.closest("[data-account-close]");

    if (closeButton) {
      event.preventDefault();

      closeAccountPopover();

      return;
    }

    const overlay = target.closest<HTMLElement>("[data-account-overlay]");

    if (overlay && target === overlay) {
      closeAccountPopover();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const overlay = getAccountOverlay();

    if (overlay?.classList.contains("open")) {
      closeAccountPopover();
    }
  });

  window.addEventListener("auth-open", openAccountPopover);
}

export function initAccountAuth(_root: HTMLElement): void {
  if (accountAuthInitialized) {
    return;
  }

  accountAuthInitialized = true;

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const switchButton = target.closest<HTMLButtonElement>(
      "[data-switch-account]",
    );

    if (switchButton) {
      event.preventDefault();

      const type = switchButton.dataset.switchAccount;

      if (type === "login" || type === "signup") {
        showAccountForm(type);
      }

      return;
    }

    const accountTab = target.closest<HTMLButtonElement>("[data-account-tab]");

    if (!accountTab) {
      return;
    }

    event.preventDefault();

    const type = accountTab.dataset.accountTab;

    if (type === "login" || type === "signup") {
      showAccountForm(type);
    }
  });
}

function showAccountForm(type: "login" | "signup"): void {
  const tabs =
    document.querySelectorAll<HTMLButtonElement>("[data-account-tab]");

  const forms = document.querySelectorAll<HTMLFormElement>(
    "[data-account-form]",
  );

  tabs.forEach((tab) => {
    const active = tab.dataset.accountTab === type;

    tab.classList.toggle("active", active);

    tab.setAttribute("aria-selected", String(active));

    tab.tabIndex = active ? 0 : -1;
  });

  forms.forEach((form) => {
    const active = form.dataset.accountForm === type;

    form.classList.toggle("active", active);

    form.setAttribute("aria-hidden", String(!active));

    form.inert = !active;
  });
}

export function initAuthForms(): void {
  if (authFormsInitialized) {
    return;
  }

  authFormsInitialized = true;

  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (form.matches('[data-form="login"], [data-account-form="login"]')) {
      await handleLogInSubmit(event);

      updateAccountUI();

      if (getCurrentUser()) {
        openAccountPopover();
      }

      return;
    }

    if (form.matches('[data-form="signup"], [data-account-form="signup"]')) {
      await handleSignUpSubmit(event);

      updateAccountUI();

      if (getCurrentUser()) {
        openAccountPopover();
      }
    }
  });
}

export function initAccountActions(): void {
  if (accountActionsInitialized) {
    return;
  }

  accountActionsInitialized = true;

  document.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const logoutButton = target.closest<HTMLButtonElement>(
      "[data-account-logout]",
    );

    if (!logoutButton) {
      return;
    }

    event.preventDefault();

    if (logoutButton.disabled) {
      return;
    }

    logoutButton.disabled = true;

    try {
      await handleLogOut();

      updateAccountUI();
    } finally {
      logoutButton.disabled = false;
    }
  });
}

export function updateAccountUI(): void {
  const auth = document.querySelector<HTMLElement>("[data-account-auth]");

  const welcome = document.querySelector<HTMLElement>("[data-account-welcome]");

  if (!auth || !welcome) {
    return;
  }

  const user = getCurrentUser();

  if (!user) {
    auth.classList.add("active");

    welcome.classList.remove("active");

    auth.inert = false;
    welcome.inert = true;

    return;
  }

  auth.classList.remove("active");

  welcome.classList.add("active");

  auth.inert = true;
  welcome.inert = false;

  const name = document.querySelector<HTMLElement>("[data-account-name]");

  const email = document.querySelector<HTMLElement>("[data-account-email]");

  const avatar = document.querySelector<HTMLElement>("[data-account-avatar]");

  const since = document.querySelector<HTMLElement>("[data-account-since]");

  if (name) {
    name.textContent = user.name;
  }

  if (email) {
    email.textContent = user.email;
  }

  if (avatar) {
    avatar.textContent = user.name.trim().charAt(0).toUpperCase();
  }

  if (since) {
    const date = new Date(user.createdAt);

    if (!Number.isNaN(date.getTime())) {
      const localeMap = {
        en: "en-US",
        ua: "uk-UA",
        de: "de-DE",
        pl: "pl-PL",
      } as const;

      const locale = localeMap[getLanguage()] ?? "en-US";

      since.textContent = date.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });
    } else {
      since.textContent = "";
    }
  }
}

export function initAccountUI(): void {
  if (accountUIInitialized) {
    return;
  }

  accountUIInitialized = true;

  updateAccountUI();

  window.addEventListener("auth-changed", () => {
    updateAccountUI();

    const overlay = getAccountOverlay();

    if (!getCurrentUser() && overlay?.classList.contains("open")) {
      closeAccountPopover();
    }
  });
}

export function hasStaticContent(key: string): boolean {
  return key in Content || key === "login" || key === "signup";
}
