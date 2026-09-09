import { t } from "../i18n";

export function renderNotFound(): string {
  return `
    <div class="not_found container">
      <div class="code">404</div>

      <h1>
        ${t("notFound.title")}
      </h1>

      <p>
        ${t("notFound.description")}
      </p>

      <a
        class="btn"
        href="/"
        data-router-link
      >
        ${t("notFound.backToHome")}
      </a>
    </div>
  `;
}
