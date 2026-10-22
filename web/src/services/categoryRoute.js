// Shared helper so every page's nav-link handler routes consistently.
//
// All categories route dynamically via their slug (e.g. "/category/rings", "/category/gold-chains")
// based on the database categories list.

/**
 * @param {string} link - the nav link label clicked (e.g. "Bangles", "Gold Chains", "Home")
 * @param {Array<{name: string, slug: string}>} categories - categories from the store
 * @returns {string} the path to navigate to
 */
export function getNavPath(link, categories = []) {
  if (!link) return "/";
  if (link === "Home") return "/";

  // Look up slug from the store's category list
  const match = categories.find(
    (c) => (c.name || "").toLowerCase() === link.toLowerCase()
  );

  if (match?.slug) {
    return `/category/${match.slug}`;
    
  }

  // Fallback: slugify the name on the fly if no slug field was found,
  // so navigation doesn't silently break even if data is incomplete
  const fallbackSlug = link
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return `/category/${fallbackSlug}`;
}
