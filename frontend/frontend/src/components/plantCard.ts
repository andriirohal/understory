import { t } from "../i18n";
import { stockLabel } from "../utils";
import type { Plant } from "../pages";

export function renderPlantCard(plant: Plant): string {
  const stock = stockLabel(plant.stock);

  return `
    <article
      class="card"
      data-plant-id="${plant.id}"
    >
      <a
        href="/plant/${plant.id}"
        aria-label="${plant.name}"
        data-plant-link
      >
        <div class="card_art">
          <img
            src="${plant.imageUrl}"
            alt="${plant.name}"
            width="300"
            height="400"
            loading="lazy"
            decoding="async"
          >
        </div>
      </a>

      <a
        href="/plant/${plant.id}"
        data-plant-link
      >
        <h3>${plant.name}</h3>
      </a>

      <div class="meta">
        <span class="price">
          €${plant.price.toFixed(2)}
        </span>

        <span class="stock ${stock.className}">
          ${t(stock.text)}
        </span>
      </div>
    </article>
  `;
}
