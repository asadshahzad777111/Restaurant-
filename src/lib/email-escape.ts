/** Escape user content for HTML email / template interpolation. */
export function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] || c;
  });
}
