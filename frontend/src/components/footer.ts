import { t } from "../i18n";
import { leafIcon } from "./icons";

const LEAF_SVG = leafIcon("#33452F");

export function renderFooter(): string {
  return `
    <footer class="site_footer">
      <div class="foot_brand">
        <div class="logo">
          ${LEAF_SVG}
          Understory
        </div>

        <p>
          ${t("footer.description")}
        </p>
      </div>

      <div>
        <h4>${t("footer.shop.title")}</h4>

        <ul>
          <li>
            <a href="/shop">
              ${t("footer.shop.options.0")}
            </a>
          </li>

          <li>
            <a href="/rare">
              ${t("footer.shop.options.1")}
            </a>
          </li>

          <li>
            <a href="/shop">
              ${t("footer.shop.options.2")}
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4>${t("footer.care.title")}</h4>

        <ul>
          <li>
            <a href="/care">
              ${t("footer.care.options.0")}
            </a>
          </li>

          <li>
            <a href="/guarantee">
              ${t("footer.care.options.1")}
            </a>
          </li>

          <li>
            <a href="/shipping">
              ${t("footer.care.options.2")}
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4>${t("footer.studio.title")}</h4>

        <ul>
          <li>
            <a href="/about">
              ${t("footer.studio.options.0")}
            </a>
          </li>

          <li>
            <a href="/about">
              ${t("footer.studio.options.1")}
            </a>
          </li>

          <li>
            <a href="/contact">
              ${t("footer.studio.options.2")}
            </a>
          </li>
        </ul>
      </div>
    </footer>

    <div class="foot_bottom">
      <span>${t("footer.year")}</span>
      <span>${t("footer.location")}</span>
    </div>
  `;
}

function refreshFooter(): void {
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const footer = app.querySelector<HTMLElement>(".site_footer");

  if (!footer) {
    return;
  }

  const temp = document.createElement("div");

  temp.innerHTML = renderFooter();

  const newFooter = temp.querySelector<HTMLElement>(".site_footer");
  const newBottom = temp.querySelector<HTMLElement>(".foot_bottom");

  if (!newFooter || !newBottom) {
    return;
  }

  footer.replaceWith(newFooter);

  const bottom = app.querySelector<HTMLElement>(".foot_bottom");

  if (bottom) {
    bottom.replaceWith(newBottom);
  }
}

window.addEventListener("languagechange", refreshFooter);
