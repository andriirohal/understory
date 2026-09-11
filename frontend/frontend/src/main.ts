import "./scss/main.scss";

import {
  renderHome,
  renderShop,
  renderPlant,
  renderRarePage,
  hasStaticContent,
  renderNotFound,
  renderStatic,
  renderAccount,
  mountShop,
  mountCart,
  loadCartPage,
  mountCheckout,
  initAccountPopover,
  initAccountUI,
  updateAccountUI,
  initAccountActions,
  initAuthForms,
} from "./pages";

import {
  renderHeader as renderHeaderComponent,
  renderFooter,
  initHeader,
} from "./components";

import { fetchCurrentUser, getAllPlants, PlantSort, PlantFamily } from "./api";

import { initLanguage } from "./i18n";

import { router } from "./routes";

let appInitialized = false;

type Plants = Awaited<ReturnType<typeof getAllPlants>>;

const plantsCache = new Map<string, Plants>();

function getCacheKey(sort?: PlantSort, family?: PlantFamily): string {
  return `${sort ?? "featured"}:${family ?? "all"}`;
}

async function getPlants(
  sort?: PlantSort,
  family?: PlantFamily,
): Promise<Plants> {
  const key = getCacheKey(sort, family);

  const cached = plantsCache.get(key);

  if (cached) {
    return cached;
  }

  const plants = await getAllPlants(100, 0, sort, family);

  plantsCache.set(key, plants);

  return plants;
}

function getCachedPlants(
  sort?: PlantSort,
  family?: PlantFamily,
): Plants | null {
  return plantsCache.get(getCacheKey(sort, family)) ?? null;
}

export function clearPlantsCache(): void {
  plantsCache.clear();
}

function getApp(): HTMLElement {
  const app = document.getElementById("app");

  if (!app) {
    throw new Error("App root element not found");
  }

  return app;
}

function getPageRoot(): HTMLElement {
  const pageRoot = document.getElementById("page-root");

  if (!pageRoot) {
    throw new Error("Page root element not found");
  }

  return pageRoot;
}

function initializeShell(
  app: HTMLElement,
  path: string,
  content: string,
): void {
  app.innerHTML = `
    ${renderHeaderComponent(path)}

    <div id="page-root">
      ${content}
    </div>

    ${renderFooter()}

    ${renderAccount()}
  `;

  initHeader(app);
  initAccountPopover(app);
  initAccountActions();
  initAuthForms();
  initAccountUI();
  updateAccountUI();

  appInitialized = true;
}

function paint(path: string, content: string): void {
  const app = getApp();

  if (!appInitialized) {
    initializeShell(app, path, content);

    return;
  }

  getPageRoot().innerHTML = content;

  updateAccountUI();
}

function refreshHeader(): void {
  const app = getApp();

  const oldHeader = app.querySelector<HTMLElement>(".site_header");

  if (!oldHeader) {
    return;
  }

  const cartCount =
    oldHeader.querySelector<HTMLElement>(".cart_count")?.textContent;

  const wrapper = document.createElement("div");

  wrapper.innerHTML = renderHeaderComponent(window.location.pathname);

  const header = wrapper.firstElementChild;

  if (!(header instanceof HTMLElement)) {
    return;
  }

  if (cartCount) {
    const newCartCount = header.querySelector<HTMLElement>(".cart_count");

    if (newCartCount) {
      newCartCount.textContent = cartCount;
    }
  }

  oldHeader.replaceWith(header);

  initHeader(app);
}

function refreshAccount(): void {
  const app = getApp();

  const oldOverlay = app.querySelector<HTMLElement>("[data-account-overlay]");

  if (!oldOverlay) {
    return;
  }

  const wasOpen = oldOverlay.classList.contains("active");

  const wrapper = document.createElement("div");

  wrapper.innerHTML = renderAccount();

  const newOverlay = wrapper.firstElementChild;

  if (!(newOverlay instanceof HTMLElement)) {
    return;
  }

  if (wasOpen) {
    newOverlay.classList.add("active");

    newOverlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("account-open");
  }

  oldOverlay.replaceWith(newOverlay);

  initAccountPopover(app);
  updateAccountUI();
}

async function repaintAfterLanguageChange(): Promise<void> {
  if (!appInitialized) {
    return;
  }

  const path = window.location.pathname;

  const pageRoot = getPageRoot();

  try {
    refreshHeader();
    refreshAccount();

    if (path === "/") {
      const plants = getCachedPlants() ?? (await getPlants());

      pageRoot.innerHTML = renderHome(plants);

      updateAccountUI();

      return;
    }

    if (path === "/shop") {
      const plants = getCachedPlants() ?? (await getPlants());

      pageRoot.innerHTML = renderShop(plants);

      mountShop(pageRoot);

      updateAccountUI();

      return;
    }

    if (path === "/rare") {
      const plants = getCachedPlants() ?? (await getPlants());

      pageRoot.innerHTML = renderRarePage(plants);

      updateAccountUI();

      return;
    }

    if (path.startsWith("/plant/")) {
      const id = path.split("/")[2];

      if (!id) {
        pageRoot.innerHTML = renderNotFound();

        updateAccountUI();

        return;
      }

      const plants = getCachedPlants() ?? (await getPlants());

      pageRoot.innerHTML = await renderPlant(id, plants);

      updateAccountUI();

      return;
    }

    if (path === "/cart") {
      pageRoot.innerHTML = await loadCartPage();

      mountCart(pageRoot);

      updateAccountUI();

      return;
    }

    if (path === "/checkout") {
      await mountCheckout(pageRoot);

      updateAccountUI();

      return;
    }

    const page = path.slice(1);

    pageRoot.innerHTML = hasStaticContent(page)
      ? renderStatic(page)
      : renderNotFound();

    updateAccountUI();
  } catch (error) {
    console.error(error);
  }
}

router
  .add("/", async () => {
    try {
      const cached = getCachedPlants();

      if (cached) {
        paint("/", renderHome(cached));

        return;
      }

      const plants = await getPlants();

      paint("/", renderHome(plants));
    } catch (error) {
      console.error(error);

      paint("/", renderHome([]));
    }
  })

  .add("/shop", async () => {
    try {
      const cached = getCachedPlants();

      if (cached) {
        paint("/shop", renderShop(cached));

        mountShop(getPageRoot());

        return;
      }

      const plants = await getPlants();

      paint("/shop", renderShop(plants));

      mountShop(getPageRoot());
    } catch (error) {
      console.error(error);

      paint("/shop", renderShop([]));
    }
  })

  .add("/rare", async () => {
    try {
      const cached = getCachedPlants();

      if (cached) {
        paint("/rare", renderRarePage(cached));

        return;
      }

      const plants = await getPlants();

      paint("/rare", renderRarePage(plants));
    } catch (error) {
      console.error(error);

      paint("/rare", renderRarePage([]));
    }
  })

  .add("/plant/:id", async ({ params }) => {
    const id = params.id;

    if (!id) {
      paint("/404", renderNotFound());

      return;
    }

    try {
      const cached = getCachedPlants();

      const plants = cached ?? (await getPlants());

      const content = await renderPlant(id, plants);

      paint(`/plant/${id}`, content);
    } catch (error) {
      console.error(error);

      paint(`/plant/${id}`, renderNotFound());
    }
  })

  .add("/cart", async () => {
    try {
      const content = await loadCartPage();

      paint("/cart", content);

      mountCart(getPageRoot());
    } catch (error) {
      console.error(error);

      paint("/cart", renderNotFound());
    }
  })

  .add("/checkout", async () => {
    try {
      const app = getApp();

      if (!appInitialized) {
        initializeShell(app, "/checkout", "");
      }

      await mountCheckout(getPageRoot());

      updateAccountUI();
    } catch (error) {
      console.error(error);

      if (appInitialized) {
        getPageRoot().innerHTML = renderNotFound();
      } else {
        paint("/checkout", renderNotFound());
      }
    }
  })

  .add("/:page", async ({ params }) => {
    const page = params.page;

    if (!hasStaticContent(page)) {
      paint("/404", renderNotFound());

      return;
    }

    paint(`/${page}`, renderStatic(page));
  })

  .notFound(async () => {
    paint("/404", renderNotFound());
  });

async function initializeApp(): Promise<void> {
  initLanguage();

  window.addEventListener("languagechange", () => {
    void repaintAfterLanguageChange();
  });

  try {
    await fetchCurrentUser();
  } catch (error) {
    console.error(error);
  }

  router.start();
}

void initializeApp();
