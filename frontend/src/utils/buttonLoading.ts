const LABEL_CLASS = "btn_label";
const SPINNER_CLASS = "btn_spinner";

export function setButtonLoading(
  button: HTMLButtonElement,
  loading: boolean,
): void {
  if (loading) {
    if (button.dataset.loading === "true") {
      return;
    }

    button.dataset.loading = "true";
    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    const label = document.createElement("span");

    label.className = LABEL_CLASS;
    label.innerHTML = button.innerHTML;

    const spinner = document.createElement("span");

    spinner.className = SPINNER_CLASS;
    spinner.setAttribute("aria-hidden", "true");

    button.innerHTML = "";
    button.appendChild(label);
    button.appendChild(spinner);

    return;
  }

  if (button.dataset.loading !== "true") {
    return;
  }

  delete button.dataset.loading;
  button.disabled = false;
  button.removeAttribute("aria-busy");

  const label = button.querySelector<HTMLElement>(`.${LABEL_CLASS}`);

  if (label) {
    button.innerHTML = label.innerHTML;
  }
}
