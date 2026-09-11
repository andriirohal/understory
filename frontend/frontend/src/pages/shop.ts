import { renderPlantCard } from "../components";
import { getAllPlants, PlantSort, PlantFamily } from "../api";
import { t } from "../i18n";
import { onClickOutside } from "../utils";

export type Plant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  family: string;
  imageUrl: string;
};

type ShopState = {
  sort?: PlantSort;
  family?: PlantFamily;
};

const FAMILIES: {
  key: "all" | PlantFamily;
  label: string;
}[] = [
  {
    key: "all",
    label: "shop.filters.all",
  },
  {
    key: "Araceae",
    label: "Araceae",
  },
  {
    key: "Moraceae",
    label: "Moraceae",
  },
];

const SORT_LABELS: Record<PlantSort, string> = {
  alphabetical: "shop.sort.name",
  cheapest: "shop.sort.priceAsc",
  expensive: "shop.sort.priceDesc",
};

let shopState: ShopState = {};

let currentPlants: Plant[] = [];

function renderPlants(plants: Plant[]): string {
  if (plants.length === 0) {
    return `
      <div class="empty_state">
        <h2>
          ${t("shop.noPlants")}
        </h2>

        <p>
          ${t("shop.noPlantsDescription")}
        </p>
      </div>
    `;
  }

  return plants.map(renderPlantCard).join("");
}

function updateGrid(root: HTMLElement, plants: Plant[]): void {
  const grid = root.querySelector<HTMLElement>("#shop_grid");

  if (!grid) {
    return;
  }

  grid.innerHTML = renderPlants(plants);
}

function updateResultCount(root: HTMLElement, plants: Plant[]): void {
  const count = root.querySelector<HTMLElement>(".result_count");

  if (!count) {
    return;
  }

  count.textContent = `${plants.length} ${
    plants.length === 1 ? t("shop.result") : t("shop.results")
  }`;
}

export function renderShop(
  plants: Plant[],
  currentSort?: PlantSort,
  currentFamily?: PlantFamily,
): string {
  currentPlants = plants;

  return `
    <section class="page_hero container">

      <div class="eyebrow">
        ${t("shop.eyebrow")}
      </div>

      <h1>
        ${t("shop.title")}
      </h1>

      <p>
        ${plants.length}
        ${plants.length === 1 ? t("shop.specimen") : t("shop.specimens")}
        ${t("shop.description")}
      </p>

    </section>

    <section class="section container">

      <div class="shop_toolbar">

        <div
          class="filter_chips"
          id="filter_chips"
          role="group"
          aria-label="${t("shop.filters.label")}"
        >
          ${FAMILIES.map(
            (family) => `
              <button
                type="button"
                data-family="${family.key}"
                class="${
                  family.key === (currentFamily ?? "all") ? "active" : ""
                }"
              >
                ${
                  family.key === "Araceae" || family.key === "Moraceae"
                    ? family.label
                    : t(family.label)
                }
              </button>
            `,
          ).join("")}
        </div>

        <div class="shop_controls">

          <span class="result_count">
            ${plants.length}
            ${plants.length === 1 ? t("shop.result") : t("shop.results")}
          </span>

          <div class="sort">

            <button
              class="sort_trigger"
              type="button"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span>
                ${
                  currentSort
                    ? t(SORT_LABELS[currentSort])
                    : t("shop.sort.featured")
                }
              </span>
            </button>

            <div
              class="sort_menu"
              role="menu"
            >

              <button
                type="button"
                role="menuitem"
                data-sort=""
                class="${!currentSort ? "active" : ""}"
              >
                ${t("shop.sort.featured")}
              </button>

              ${Object.entries(SORT_LABELS)
                .map(
                  ([key, label]) => `
                    <button
                      type="button"
                      role="menuitem"
                      data-sort="${key}"
                      class="${key === currentSort ? "active" : ""}"
                    >
                      ${t(label)}
                    </button>
                  `,
                )
                .join("")}

            </div>

          </div>

        </div>

      </div>

      <div
        class="grid"
        id="shop_grid"
      >
        ${renderPlants(plants)}
      </div>

    </section>
  `;
}

function initSort(root: HTMLElement, state: ShopState): void {
  const sort = root.querySelector<HTMLElement>(".sort");

  if (!sort) {
    return;
  }

  const trigger = sort.querySelector<HTMLButtonElement>(".sort_trigger");

  const menu = sort.querySelector<HTMLElement>(".sort_menu");

  if (!trigger || !menu) {
    return;
  }

  const closeMenu = (): void => {
    sort.classList.remove("is_open");

    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen = sort.classList.contains("is_open");

    if (isOpen) {
      closeMenu();
      return;
    }

    sort.classList.add("is_open");

    trigger.setAttribute("aria-expanded", "true");
  });

  menu.querySelectorAll<HTMLButtonElement>("[data-sort]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sortValue = button.dataset.sort;

      const selectedSort = sortValue ? (sortValue as PlantSort) : undefined;

      try {
        const plants = await getAllPlants(100, 0, selectedSort, state.family);

        state.sort = selectedSort;

        currentPlants = plants;

        updateGrid(root, plants);
        updateResultCount(root, plants);

        const label = trigger.querySelector("span");

        if (label) {
          label.textContent = selectedSort
            ? t(SORT_LABELS[selectedSort])
            : t("shop.sort.featured");
        }

        menu
          .querySelectorAll<HTMLButtonElement>("[data-sort]")
          .forEach((item) => {
            item.classList.remove("active");
          });

        button.classList.add("active");

        closeMenu();
      } catch (error) {
        console.error("SORT PLANTS ERROR:", error);
      }
    });
  });

  onClickOutside(sort, closeMenu);
}

function initFamily(root: HTMLElement, state: ShopState): void {
  const filters = root.querySelector<HTMLElement>("#filter_chips");

  if (!filters) {
    return;
  }

  filters
    .querySelectorAll<HTMLButtonElement>("[data-family]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const family = button.dataset.family;

        const selectedFamily =
          family === "Araceae" || family === "Moraceae" ? family : undefined;

        try {
          const plants = await getAllPlants(100, 0, state.sort, selectedFamily);

          state.family = selectedFamily;

          currentPlants = plants;

          updateGrid(root, plants);
          updateResultCount(root, plants);

          filters
            .querySelectorAll<HTMLButtonElement>("[data-family]")
            .forEach((item) => {
              item.classList.remove("active");
            });

          button.classList.add("active");
        } catch (error) {
          console.error("FILTER PLANTS ERROR:", error);
        }
      });
    });
}

export function mountShop(root: HTMLElement): void {
  initSort(root, shopState);
  initFamily(root, shopState);
}

export function getShopState(): ShopState {
  return { ...shopState };
}

export function setShopState(state: ShopState): void {
  shopState = { ...state };
}

export function refreshShopTranslations(root: HTMLElement): void {
  const state = getShopState();

  root.innerHTML = renderShop(currentPlants, state.sort, state.family);

  mountShop(root);
}
