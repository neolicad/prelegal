/** Converts free text into a lowercase, hyphen-separated slug for use in filenames. */
export function slugify(value: string, fallback = "party"): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}
