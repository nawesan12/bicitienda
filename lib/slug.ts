/**
 * Slug para URLs e ids legibles: minúsculas, sin tildes, guiones. Puro
 * (server y cliente).
 */
export function slugify(text: string, max = 60): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, max)
    .replace(/-$/, "");
}
