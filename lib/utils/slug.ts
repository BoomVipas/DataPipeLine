/**
 * Generates a URL-friendly slug from an English venue name.
 * Example: "Flow Space Yoga!" → "flow-space-yoga"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // remove non-alphanumeric (keep spaces and hyphens)
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-');           // collapse multiple hyphens
}

/**
 * Given a desired slug and a list of existing slugs, returns a unique slug
 * by appending -2, -3, etc. if needed.
 */
export function makeUniqueSlug(desired: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(desired)) return desired;

  let counter = 2;
  while (existingSlugs.includes(`${desired}-${counter}`)) {
    counter++;
  }
  return `${desired}-${counter}`;
}
