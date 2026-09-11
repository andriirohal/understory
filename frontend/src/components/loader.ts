import { t } from "../i18n";

const LEAF_SVG = `
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 21V10M12 10C12 6 9 3 5 3C5 7 8 10 12 10ZM12 10C12 6 15 3 19 3C19 7 16 10 12 10Z"
      stroke="currentColor"
      stroke-width="1.4"
    />
  </svg>
`;

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
