type ToastKind = "success" | "error" | "default";

let stack: HTMLElement | null = null;

function ensureStack(): HTMLElement {
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast_stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }

  return stack;
}

export function showToast(
  message: string,
  kind: ToastKind = "default",
  duration = 3200,
) {
  const container = ensureStack();
  const el = document.createElement("div");

  el.className = `toast ${kind}`;
  el.textContent = message;

  container.appendChild(el);

  window.setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.2s ease";

    window.setTimeout(() => el.remove(), 200);
  }, duration);
}
