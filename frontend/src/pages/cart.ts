import { getCart, updateCart, removeFromCart } from "../api";

import { getAccessToken } from "../api/authState";
import { t } from "../i18n";
import { router } from "../routes";

const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_COST = 10;
const TAX_RATE = 0.2;

type CartLine = {
  id: string;
  cartId: string;
  plantId: string;
  quantity: number;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
};

let currentCartRoot: HTMLElement | null = null;
let currentPageRoot: HTMLElement | null = null;
let currentLines: CartLine[] = [];

let authListenerInitialized = false;
let cartEventsInitialized = false;

const pendingQuantities = new Map<string, number>();
const syncingPlants = new Set<string>();

function renderEmptyCart(): string {
  return `
    <div class="empty_state">
      <svg
        class="empty_icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 4h2l1.6 10.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          cx="9"
          cy="20"
          r="1.4"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <circle
          cx="17"
          cy="20"
          r="1.4"
          stroke="currentColor"
          stroke-width="1.4"
        />
      </svg>

      <h2>${t("cart.emptyTitle")}</h2>

      <p>${t("cart.emptyDescription")}</p>

      <a
        class="btn"
        href="/shop"
      >
        ${t("cart.shopCollection")}
      </a>
    </div>
  `;
}

function calculateCartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce(
    (total, line) => total + line.price * line.quantity,
    0,
  );

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

  const tax = Math.round(subtotal * TAX_RATE);

  const total = subtotal + shipping + tax;

  return {
    subtotal,
    shipping,
    remaining,
    tax,
    total,
  };
}

function renderShippingProgress(subtotal: number): string {
  const pct = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  );

  return `
    <div
      class="shipping_progress"
      data-cart-shipping-progress
    >
      <div
        class="shipping_progress_bar"
        style="width: ${pct}%"
      ></div>
    </div>
  `;
}

function renderCartContent(lines: CartLine[]): string {
  const { subtotal, shipping, remaining, tax, total } =
    calculateCartTotals(lines);

  return `
    <div class="cart_layout">

      <div
        class="cart_list"
        id="cart_list"
      >
        ${lines
          .map(
            (line) => `
              <div
                class="cart_row"
                data-id="${line.plantId}"
                data-href="/plant/${line.plantId}"
                role="link"
                tabindex="0"
              >

                <div class="row_art">
                  ${
                    line.imageUrl
                      ? `
                        <img
                          src="${line.imageUrl}"
                          alt="${line.name}"
                          loading="lazy"
                          decoding="async"
                        />
                      `
                      : ""
                  }
                </div>

                <div class="row_body">

                  <div class="row_top">
                    <h3>
                      ${line.name}
                    </h3>

                    <button
                      type="button"
                      class="row_remove"
                      data-remove="${line.plantId}"
                      aria-label="${t("cart.remove")} ${line.name}"
                      title="${t("cart.remove")}"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
                          stroke="currentColor"
                          stroke-width="1.4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <div class="row_unit_price">
                      €${line.price.toFixed(2)} ${t("cart.each")}
                  </div>
                  
                  <div class="row_bottom">

                    <div
                      class="qty_control"
                      data-id="${line.plantId}"
                    >

                      <button
                        type="button"
                        class="qty_btn qty_minus"
                        data-qty-minus="${line.plantId}"
                        aria-label="${t("cart.decreaseQuantity")}"
                      >
                        <span aria-hidden="true">
                          −
                        </span>
                      </button>

                      <span
                        class="qty_value"
                        data-qty-value="${line.plantId}"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        ${line.quantity}
                      </span>

                      <button
                        type="button"
                        class="qty_btn qty_plus"
                        data-qty-plus="${line.plantId}"
                        aria-label="${t("cart.increaseQuantity")}"
                        ${line.quantity >= line.stock ? "disabled" : ""}
                      >
                        <span aria-hidden="true">
                          +
                        </span>
                      </button>

                    </div>

                    <span
                      class="row_line_total"
                      data-line-price="${line.plantId}"
                    >
                      €${(line.price * line.quantity).toFixed(2)}
                    </span>

                  </div>

                </div>

              </div>
            `,
          )
          .join("")}
      </div>

      <aside class="summary_panel">

        <h2>
          ${t("cart.orderSummary")}
        </h2>

        <div class="shipping_status ${shipping === 0 ? "free_shipping" : ""}">
          <p
            class="hint"
            data-cart-shipping-hint
          >
            ${
              shipping === 0
                ? t("cart.freeShippingUnlocked")
                : t("cart.freeShipping", {
                    amount: remaining.toFixed(2),
                  })
            }
          </p>

          ${renderShippingProgress(subtotal)}
        </div>

        <div class="summary_block_line">

          <div class="summary_line">
            <span>
              ${t("cart.subtotal")}
            </span>

            <span data-cart-subtotal>
              €${subtotal.toFixed(2)}
            </span>
          </div>

          <div class="summary_line">
            <span>
              ${t("cart.shipping")}
            </span>

            <span data-cart-shipping>
              ${shipping === 0 ? t("cart.free") : `€${shipping.toFixed(2)}`}
            </span>
          </div>

          <div class="summary_line">
            <span>
              ${t("cart.estimatedTax")}
            </span>

            <span data-cart-tax>
              €${tax.toFixed(2)}
            </span>
          </div>

        </div>

        <div class="summary_total">
          <span>
            ${t("cart.total")}
          </span>

          <span data-cart-total>
            €${total.toFixed(2)}
          </span>
        </div>

        <a
          class="btn block"
          href="/checkout"
        >
          ${t("cart.proceedToCheckout")}
        </a>

      </aside>

    </div>
  `;
}

export function renderCart(lines: CartLine[]): string {
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);

  return `
    <section class="page_hero container">

      <div class="eyebrow">
        ${t("cart.yourBag")}
      </div>

      <h1>
        ${t("cart.reviewYourBag")}
        ${
          itemCount > 0
            ? `
              <span
                class="bag_count_chip"
                data-cart-item-count
              >
                ${itemCount}
              </span>
            `
            : ""
        }
      </h1>

    </section>

    <section
      class="section container"
      id="cart_root"
    >
      ${lines.length === 0 ? renderEmptyCart() : renderCartContent(lines)}
    </section>
  `;
}

function normalizeCartLines(items: unknown[]): CartLine[] {
  return items
    .map((item) => {
      const cartItem = item as Record<string, unknown>;

      const plantId =
        (cartItem.plantId as string) ||
        (cartItem.plant_id as string) ||
        (cartItem.productId as string) ||
        (cartItem.product_id as string) ||
        (cartItem.id as string) ||
        "";

      if (!plantId) {
        return null;
      }

      const cartLine: CartLine = {
        id: (cartItem.id as string) || plantId,

        cartId: (cartItem.cartId as string) || "",

        plantId,

        quantity: Math.max(1, Number(cartItem.quantity) || 1),

        name:
          (cartItem.name as string) ||
          (cartItem.title as string) ||
          "Unknown Item",

        price: Number(cartItem.price) || 0,

        stock: Number(cartItem.stock) || 0,

        imageUrl:
          (cartItem.imageUrl as string) || (cartItem.image_url as string),
      };

      return cartLine;
    })
    .filter((item): item is CartLine => item !== null);
}

async function fetchCart(): Promise<CartLine[]> {
  try {
    const cart = await getCart();

    const items = Array.isArray(cart.data?.items) ? cart.data.items : [];

    return normalizeCartLines(items);
  } catch {
    return [];
  }
}

export async function loadCartPage(): Promise<string> {
  if (!getAccessToken()) {
    currentLines = [];

    return renderCart([]);
  }

  currentLines = await fetchCart();

  return renderCart(currentLines);
}

async function refreshCartInBackground(): Promise<void> {
  const root = currentCartRoot;

  if (!root || !document.body.contains(root) || !getAccessToken()) {
    return;
  }

  try {
    const lines = await fetchCart();

    if (root !== currentCartRoot || !document.body.contains(root)) {
      return;
    }

    currentLines = lines;

    pendingQuantities.clear();
    syncingPlants.clear();

    root.innerHTML =
      currentLines.length === 0
        ? renderEmptyCart()
        : renderCartContent(currentLines);

    updateItemCountChip();
  } catch {
    return;
  }
}

function clearCartUI(): void {
  const root = currentCartRoot;

  if (!root) {
    return;
  }

  currentLines = [];

  pendingQuantities.clear();
  syncingPlants.clear();

  root.innerHTML = renderEmptyCart();

  updateItemCountChip();
}

function initCartAuthListener(): void {
  if (authListenerInitialized) {
    return;
  }

  authListenerInitialized = true;

  window.addEventListener("auth-changed", () => {
    pendingQuantities.clear();
    syncingPlants.clear();

    const root = currentCartRoot;

    if (!root || !document.body.contains(root)) {
      return;
    }

    if (!getAccessToken()) {
      clearCartUI();
      return;
    }

    void refreshCartInBackground();
  });
}

function updateCartQuantityUI(root: HTMLElement, plantId: string): void {
  const line = currentLines.find((item) => item.plantId === plantId);

  if (!line) {
    return;
  }

  const quantityElement = root.querySelector<HTMLElement>(
    `[data-qty-value="${plantId}"]`,
  );

  if (quantityElement) {
    quantityElement.textContent = String(line.quantity);
  }

  const plusButton = root.querySelector<HTMLButtonElement>(
    `button[data-qty-plus="${plantId}"]`,
  );

  if (plusButton) {
    plusButton.disabled = line.quantity >= line.stock;
  }

  const minusButton = root.querySelector<HTMLButtonElement>(
    `button[data-qty-minus="${plantId}"]`,
  );

  if (minusButton) {
    minusButton.disabled = false;
  }

  const priceElement = root.querySelector<HTMLElement>(
    `[data-line-price="${plantId}"]`,
  );

  if (priceElement) {
    priceElement.textContent = `€${(line.price * line.quantity).toFixed(2)}`;
  }

  updateCartSummary(root);
}

function updateCartSummary(root: HTMLElement): void {
  const { subtotal, shipping, remaining, tax, total } =
    calculateCartTotals(currentLines);

  const subtotalElement = root.querySelector<HTMLElement>(
    "[data-cart-subtotal]",
  );

  const shippingElement = root.querySelector<HTMLElement>(
    "[data-cart-shipping]",
  );

  const taxElement = root.querySelector<HTMLElement>("[data-cart-tax]");

  const totalElement = root.querySelector<HTMLElement>("[data-cart-total]");

  const shippingHint = root.querySelector<HTMLElement>(
    "[data-cart-shipping-hint]",
  );

  if (subtotalElement) {
    subtotalElement.textContent = `€${subtotal.toFixed(2)}`;
  }

  if (shippingElement) {
    shippingElement.textContent =
      shipping === 0 ? t("cart.free") : `€${shipping.toFixed(2)}`;
  }

  if (taxElement) {
    taxElement.textContent = `€${tax.toFixed(2)}`;
  }

  if (totalElement) {
    totalElement.textContent = `€${total.toFixed(2)}`;
  }

  if (shippingHint) {
    shippingHint.textContent =
      shipping === 0
        ? t("cart.freeShippingUnlocked")
        : t("cart.freeShipping", {
            amount: remaining.toFixed(2),
          });

    shippingHint.classList.toggle("free_shipping", shipping === 0);

    shippingHint.parentElement?.classList.toggle(
      "free_shipping",
      shipping === 0,
    );
  }

  const shippingProgress = root.querySelector<HTMLElement>(
    "[data-cart-shipping-progress] .shipping_progress_bar",
  );

  if (shippingProgress) {
    const pct = Math.min(
      100,
      Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100),
    );

    shippingProgress.style.width = `${pct}%`;
  }

  updateItemCountChip();
}

function syncQuantity(plantId: string): void {
  if (syncingPlants.has(plantId)) {
    return;
  }

  if (!getAccessToken()) {
    return;
  }

  syncingPlants.add(plantId);

  void (async () => {
    try {
      while (getAccessToken()) {
        const desired = pendingQuantities.get(plantId);

        if (desired === undefined) {
          break;
        }

        await updateCart(plantId, desired);

        if (pendingQuantities.get(plantId) === desired) {
          pendingQuantities.delete(plantId);

          break;
        }
      }
    } catch {
      await refreshCartInBackground();
    } finally {
      syncingPlants.delete(plantId);
    }
  })();
}

function changeQuantity(plantId: string, quantity: number): void {
  const line = currentLines.find((item) => item.plantId === plantId);

  if (!line) {
    return;
  }

  if (quantity < 0) {
    return;
  }

  if (quantity === 0) {
    void removeCartItem(plantId);

    return;
  }

  if (quantity > line.stock) {
    return;
  }

  line.quantity = quantity;

  pendingQuantities.set(plantId, quantity);

  const root = currentCartRoot;

  if (root) {
    updateCartQuantityUI(root, plantId);
  }

  syncQuantity(plantId);
}

async function removeCartItem(plantId: string): Promise<void> {
  const root = currentCartRoot;

  if (!root) {
    return;
  }

  const index = currentLines.findIndex((item) => item.plantId === plantId);

  if (index === -1) {
    return;
  }

  pendingQuantities.delete(plantId);

  syncingPlants.delete(plantId);
  const removedLine = currentLines[index];

  currentLines.splice(index, 1);

  const row = root.querySelector<HTMLElement>(
    `.cart_row[data-id="${plantId}"]`,
  );

  row?.remove();

  if (currentLines.length === 0) {
    root.innerHTML = renderEmptyCart();

    updateItemCountChip();
  } else {
    updateCartSummary(root);
  }

  try {
    await removeFromCart(plantId);
  } catch {
    if (removedLine) {
      currentLines.splice(index, 0, removedLine);
    }

    await refreshCartInBackground();
  }
}

function initCartEvents(): void {
  if (cartEventsInitialized) {
    return;
  }

  cartEventsInitialized = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;

      const plusButton = target?.closest<HTMLButtonElement>(
        "button[data-qty-plus]",
      );

      if (plusButton) {
        event.preventDefault();
        event.stopPropagation();

        if (plusButton.disabled) {
          return;
        }

        const plantId = plusButton.getAttribute("data-qty-plus");

        if (!plantId) {
          return;
        }

        const line = currentLines.find((item) => item.plantId === plantId);

        if (!line) {
          return;
        }

        if (line.quantity >= line.stock) {
          return;
        }

        changeQuantity(plantId, line.quantity + 1);

        return;
      }

      const minusButton = target?.closest<HTMLButtonElement>(
        "button[data-qty-minus]",
      );

      if (minusButton) {
        event.preventDefault();
        event.stopPropagation();

        const plantId = minusButton.getAttribute("data-qty-minus");

        if (!plantId) {
          return;
        }

        const line = currentLines.find((item) => item.plantId === plantId);

        if (!line) {
          return;
        }

        changeQuantity(plantId, line.quantity - 1);

        return;
      }

      const removeButton = target?.closest<HTMLButtonElement>(
        "button[data-remove]",
      );

      if (removeButton) {
        event.preventDefault();
        event.stopPropagation();

        const plantId = removeButton.getAttribute("data-remove");

        if (!plantId) {
          return;
        }

        void removeCartItem(plantId);

        return;
      }

      if (target?.closest("button, a, input, select, textarea, .qty_control")) {
        return;
      }

      const row = target?.closest<HTMLElement>(".cart_row");

      if (!row) {
        return;
      }

      const href = row.dataset.href;

      if (href) {
        void router.navigate(href);
      }
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target as HTMLElement;

    if (target?.closest("button, a, input, select, textarea, .qty_control")) {
      return;
    }

    const row = target?.closest<HTMLElement>(".cart_row");

    if (!row) {
      return;
    }

    event.preventDefault();

    const href = row.dataset.href;

    if (href) {
      void router.navigate(href);
    }
  });
}

function updateItemCountChip(): void {
  const chip = currentPageRoot?.querySelector<HTMLElement>(
    "[data-cart-item-count]",
  );

  const itemCount = currentLines.reduce(
    (count, line) => count + line.quantity,
    0,
  );

  if (!chip) {
    return;
  }

  if (itemCount === 0) {
    chip.remove();

    return;
  }

  chip.textContent = String(itemCount);
}

export function mountCart(root: HTMLElement): void {
  currentPageRoot = root;
  currentCartRoot = root.querySelector<HTMLElement>("#cart_root");

  pendingQuantities.clear();
  syncingPlants.clear();

  initCartAuthListener();
  initCartEvents();
}
