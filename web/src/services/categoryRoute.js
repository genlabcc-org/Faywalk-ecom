// Shared helper so every page's nav-link handler routes consistently.
//
// Default categories (hardcoded routes already in App.jsx) go to
// their existing fixed path, e.g. "Bangles" -> "/bangles".
//
// Any other category name (created by an admin, stored in the
// categories table) routes via its slug instead, e.g.
// "Gold Chains" -> "/category/gold-chains".

const DEFAULT_CATEGORIES = [
  "Rings",
  "Toe Rings",
  "Earrings",
  "Bracelets",
  "Bangles",
  "Necklaces",
  "Anklets",
  "Hip Accessories",
];

/**
 * @param {string} link - the nav link label clicked (e.g. "Bangles", "Gold Chains", "Home")
 * @param {Array<{name: string, slug: string}>} categories - categories from the store
 * @returns {string} the path to navigate to
 */
export function getNavPath(link, categories = []) {
  // console.log("========== getNavPath ==========");
  // console.log("link:", link);
  // console.log("categories:", categories);


  if (link === "Home") return "/";

  const isDefault = DEFAULT_CATEGORIES.some(
    (d) => d.toLowerCase() === link.toLowerCase()
  );
  if (isDefault) {
    return `/${link.toLowerCase().trim().replace(/\s+/g, '-')}`;
  }

  // Custom category — look up its slug from the store's category list
  const match = categories.find(
    (c) => (c.name || "").toLowerCase() === link.toLowerCase()
  );

  if (match?.slug) {
    return `/category/${match.slug}`;
  }

  // Fallback: slugify the name on the fly if no slug field was found,
  // so navigation doesn't silently break even if data is incomplete
  const fallbackSlug = link.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // console.log("FALLBACK PATH:", path);
  return `/category/${fallbackSlug}`;
}
