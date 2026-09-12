// No server, no database, no per-request work: the whole app is static.
export const prerender = true;
export const ssr = true;

/**
 * Write each page as `route/index.html` rather than `route.html`.
 *
 * Every static host — Vercel included — serves a directory's index.html at the
 * bare path, so this is what makes /challenges resolve without host-specific
 * rewrite rules. The alternative, Vercel's `cleanUrls`, publishes index.html at
 * /index and then redirects /index back to /, which nothing serves: the root
 * page 404s.
 */
export const trailingSlash = 'always';
