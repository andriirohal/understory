export function leafIcon(stroke: string): string {
  return `
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 21V10M12 10C12 6 9 3 5 3C5 7 8 10 12 10ZM12 10C12 6 15 3 19 3C19 7 16 10 12 10Z"
      stroke="${stroke}"
      stroke-width="1.4"
    />
  </svg>
`;
}
