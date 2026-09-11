import { t } from "../i18n";
import { leafIcon } from "./icons";

const LEAF_SVG = leafIcon("currentColor");

export function renderSplashLoader(): string {
  return `
    <div
      class="app_splash"
      role="status"
      aria-live="polite"
    >
      <div class="app_splash_mark">
        ${LEAF_SVG}
      </div>

      <span class="visually_hidden">
        ${t("common.loading")}
      </span>
    </div>
  `;
}

export function renderPageLoader(message?: string): string {
  return `
    <div
      class="page_loader"
      role="status"
      aria-live="polite"
    >
      <span
        class="page_loader_spinner"
        aria-hidden="true"
      ></span>

      <p>
        ${message ?? t("common.loading")}
      </p>
    </div>
  `;
}
