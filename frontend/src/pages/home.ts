import { renderPlantCard } from "../components";

import { t } from "../i18n";
import type { Plant } from "./shop";

export function renderHome(plants: Plant[]): string {
  const featuredPlant = plants.find(
    (plant) => plant.name === "Monstera Deliciosa",
  );

  const arrivals = plants.slice(0, 4);

  const heroImage = featuredPlant
    ? `
        <div class="hero_image">
          <img
            src="${featuredPlant.imageUrl}"
            alt="${featuredPlant.name}"
            fetchpriority="high"
            decoding="async"
            class="is_loaded"
          >
        </div>
      `
    : "";

  return `
    <div class="home">

      <section class="hero container">

        <div class="hero_content">

          <div
            class="eyebrow"
            data-i18n="hero.eyebrow"
          >
            ${t("hero.eyebrow")}
          </div>

          <div class="hero_title">

            <h1>

              <span
                data-i18n="hero.titleStart"
              >
                ${t("hero.titleStart")}
              </span>

              <em
                data-i18n="hero.titleEmphasis"
              >
                ${t("hero.titleEmphasis")}
              </em>

              <span
                data-i18n="hero.titleEnd"
              >
                ${t("hero.titleEnd")}
              </span>

            </h1>

          </div>

          <p
            class="hero_description"
            data-i18n="hero.description"
          >
            ${t("hero.description")}
          </p>

          <div class="hero_actions">

            <a
              class="btn"
              href="/shop"
              data-i18n="hero.actions.shop"
            >
              ${t("hero.actions.shop")}
            </a>

            <a
              class="btn ghost"
              href="/care"
              data-i18n="hero.actions.ghost"
            >
              ${t("hero.actions.ghost")}
            </a>

          </div>

        </div>

        <div class="hero_art">
          ${heroImage}
        </div>

      </section>

      <section class="section container">

        <div class="section_head">

          <h2
            data-i18n="head.arrival"
          >
            ${t("head.arrival")}
          </h2>

          <a
            href="/shop"
            data-i18n="head.view"
          >
            ${t("head.view")}
          </a>

        </div>

        <div
          class="grid"
          id="arrivals_grid"
        >
          ${arrivals.map(renderPlantCard).join("")}
        </div>

      </section>

      <section class="philosophy">

        <div class="philosophy_item">

          <div class="num">
            01
          </div>

          <h3
            data-i18n="philosophy.title1"
          >
            ${t("philosophy.title1")}
          </h3>

          <p
            data-i18n="philosophy.description1"
          >
            ${t("philosophy.description1")}
          </p>

        </div>

        <div class="philosophy_item">

          <div class="num">
            02
          </div>

          <h3
            data-i18n="philosophy.title2"
          >
            ${t("philosophy.title2")}
          </h3>

          <p
            data-i18n="philosophy.description2"
          >
            ${t("philosophy.description2")}
          </p>

        </div>

        <div class="philosophy_item">

          <div class="num">
            03
          </div>

          <h3
            data-i18n="philosophy.title3"
          >
            ${t("philosophy.title3")}
          </h3>

          <p
            data-i18n="philosophy.description3"
          >
            ${t("philosophy.description3")}
          </p>

        </div>

      </section>

      <section class="quote">

        <blockquote
          data-i18n="quote.title"
        >
          "${t("quote.title")}"
        </blockquote>

        <cite
          data-i18n="quote.description"
        >
          ${t("quote.description")}
        </cite>

      </section>

    </div>
  `;
}
