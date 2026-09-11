import { getLanguage, Language, setLanguage, t } from "../i18n";
import { getCart } from "../api";
import { leafIcon } from "./icons";

const LEAF_SVG = leafIcon("currentColor");

let globalCartListenerInitialized = false;
let globalAuthListenerInitialized = false;
let pageChangeListenerInitialized = false;
let headerClickListenerInitialized = false;
let initialCartCountLoaded = false;
let cartCountRequestId = 0;

function preloadShopImages(): void {
  const image = new Image();
  image.src = "/images/monstera.webp";
}

export function renderHeader(activePath: string): string {
  const currentLanguage = getLanguage();

  const navItem = (href: string, label: string): string => {
    const active = activePath === href || activePath.startsWith(`${href}/`);

    return `
      <a
        href="${href}"
        class="${active ? "active" : ""}"
        data-nav-path="${href}"
      >
        ${label}
      </a>
    `;
  };

  return `
    <header class="site_header">

      <a
        href="/"
        class="logo"
      >
        ${LEAF_SVG}
        Understory
      </a>

      <nav class="site_nav">
        ${navItem("/shop", t("header.collection"))}
        ${navItem("/rare", t("header.rarePlants"))}
        ${navItem("/care", t("header.journal"))}
        ${navItem("/about", t("header.about"))}
      </nav>

      <div class="header_right">

        <button
          type="button"
          class="icon_btn"
          data-account-open
        >
          ${t("header.account")}
        </button>

        <a
          href="/cart"
          class="icon_btn header_bag"
          id="header_cart_link"
          aria-label="${t("header.bag")}"
        >
          <span class="header_bag_label">
            ${t("header.bag")}
          </span>

          <span
            class="cart_count is_loading"
            aria-hidden="true"
          >
            ( 0 )
          </span>
        </a>

        <details class="lang_switcher">

          <summary
            class="lang_trigger"
            aria-label="Change language"
          >
            <svg
              class="lang_globe"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="1.4"
              />

              <path
                d="M3 12H21M12 3C14.5 6 14.5 18 12 21M12 3C9.5 6 9.5 18 12 10"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>

            <span class="lang_code">
              ${currentLanguage.toUpperCase()}
            </span>

            <span class="lang_divider"></span>

            <svg
              class="lang_chevron"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </summary>

          <div class="lang_menu">

            <div class="lang_menu_label">
              ${t("header.shopIn")}
            </div>

            ${renderLanguageOption(
              "en",
              "English",
              "EN",
              "#c0842b",
              currentLanguage,
            )}

            ${renderLanguageOption(
              "ua",
              "Українська",
              "UA",
              "#33452f",
              currentLanguage,
            )}

            ${renderLanguageOption(
              "pl",
              "Polski",
              "PL",
              "#b0673f",
              currentLanguage,
            )}

            ${renderLanguageOption(
              "de",
              "Deutsch",
              "DE",
              "#7c8f62",
              currentLanguage,
            )}

          </div>
        </details>

      </div>
    </header>
  `;
}

function renderLanguageOption(
  language: Language,
  name: string,
  code: string,
  color: string,
  currentLanguage: Language,
): string {
  return `
    <button
      type="button"
      class="lang_option ${currentLanguage === language ? "active" : ""}"
      data-lang="${language}"
    >
      <span
        class="lang_dot"
        style="background:${color}"
      ></span>

      <span class="lang_option_name">
        ${name}
      </span>

      <span class="lang_option_code">
        ${code}
      </span>
    </button>
  `;
}

function setHeaderCartCount(count: number): void {
  const cartCount = document.querySelector<HTMLElement>(".cart_count");

  if (!cartCount) {
    return;
  }

  cartCount.classList.remove("is_loading");
  cartCount.textContent = `( ${Math.max(0, count)} )`;
}

export async function updateHeaderCartCount(): Promise<void> {
  const requestId = ++cartCountRequestId;

  const cartCount = document.querySelector<HTMLElement>(".cart_count");

  if (!cartCount) {
    return;
  }

  try {
    const cart = await getCart();

    if (requestId !== cartCountRequestId) {
      return;
    }

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

    setHeaderCartCount(count);
  } catch {
    if (requestId !== cartCountRequestId) {
      return;
    }

    setHeaderCartCount(0);
  }
}

export function initGlobalCartListener(): void {
  if (globalCartListenerInitialized) {
    return;
  }

  globalCartListenerInitialized = true;

  window.addEventListener("cartchange", (event: Event) => {
    cartCountRequestId++;

    const customEvent = event as CustomEvent<{
      count?: number;
    }>;

    const count = customEvent.detail?.count;

    if (typeof count === "number") {
      setHeaderCartCount(count);
      return;
    }

    void updateHeaderCartCount();
  });
}

export function initGlobalAuthListener(): void {
  if (globalAuthListenerInitialized) {
    return;
  }

  globalAuthListenerInitialized = true;

  window.addEventListener("auth-changed", () => {
    cartCountRequestId++;
    void updateHeaderCartCount();
  });
}

function updateActiveNavigation(): void {
  const currentPath = window.location.pathname;

  const navLinks = document.querySelectorAll<HTMLAnchorElement>(
    ".site_nav a[data-nav-path], .mobile_nav a[data-nav-path]",
  );

  navLinks.forEach((link) => {
    const path = link.dataset.navPath;

    if (!path) {
      return;
    }

    const active = currentPath === path || currentPath.startsWith(`${path}/`);

    link.classList.toggle("active", active);
  });
}

function initPageChangeListener(): void {
  if (pageChangeListenerInitialized) {
    return;
  }

  pageChangeListenerInitialized = true;

  window.addEventListener("page-changed", updateActiveNavigation);

  window.addEventListener("popstate", updateActiveNavigation);
}

function initOutsideClickListener(): void {
  if (headerClickListenerInitialized) {
    return;
  }

  headerClickListenerInitialized = true;

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    const switcher =
      document.querySelector<HTMLDetailsElement>(".lang_switcher");

    if (switcher && !switcher.contains(target)) {
      switcher.open = false;
    }
  });
}

function initLanguageOptions(root: ParentNode): void {
  const langSwitcher = root.querySelector<HTMLDetailsElement>(".lang_switcher");

  if (!langSwitcher) {
    return;
  }

  const languageOptions =
    langSwitcher.querySelectorAll<HTMLButtonElement>(".lang_option");

  languageOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const language = option.dataset.lang as Language | undefined;

      if (!language) {
        return;
      }

      langSwitcher.open = false;

      if (language === getLanguage()) {
        return;
      }

      setLanguage(language);
    });
  });
}

export function initHeader(root: ParentNode): void {
  initGlobalCartListener();
  initGlobalAuthListener();
  initPageChangeListener();
  initOutsideClickListener();

  const accountButton = root.querySelector<HTMLButtonElement>(
    "[data-account-open]",
  );

  if (accountButton && accountButton.dataset.initialized !== "true") {
    accountButton.dataset.initialized = "true";

    accountButton.addEventListener("click", (event) => {
      event.preventDefault();

      window.dispatchEvent(new Event("auth-open"));
    });
  }

  const shopLink = root.querySelector<HTMLAnchorElement>(
    '.site_nav a[data-nav-path="/shop"]',
  );

  if (shopLink) {
    shopLink.addEventListener("mouseenter", preloadShopImages, { once: true });
  }

  initLanguageOptions(root);

  if (!initialCartCountLoaded) {
    initialCartCountLoaded = true;
    void updateHeaderCartCount();
  }

  updateActiveNavigation();
}
