export function onClickOutside(
  element: Element,
  handler: () => void,
): () => void {
  const listener = (event: MouseEvent): void => {
    if (element.contains(event.target as Node)) {
      return;
    }

    handler();
  };

  document.addEventListener("mousedown", listener);

  return () => {
    document.removeEventListener("mousedown", listener);
  };
}
