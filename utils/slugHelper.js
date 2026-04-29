

/**
 * Generate a URL-safe slug from a string.
 * e.g. "Short Films!" → "short-films"
 *
 * @param {string} text - The source text to slugify
 * @returns {string} - The generated slug
 */
export const generateSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // remove special characters
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens

/**
 * Ensure slug uniqueness against a given Prisma model.
 * If "short-films" exists, tries "short-films-2", "short-films-3", etc.
 *
 * @param {string} baseSlug - The generated base slug
 * @param {object} model    - The Prisma model to check against (e.g. prisma.collection)
 * @returns {Promise<string>} - A unique slug
 */
export const ensureUniqueSlug = async (baseSlug, model) => {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await model.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};
