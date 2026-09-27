/**
 * Usernames live at the root of the URL space (/{username}), so they must not
 * collide with application routes or obvious future ones.
 */
export const RESERVED_USERNAMES = new Set([
  "about", "account", "admin", "api", "app", "assets", "auth", "authors", "blog", "bookmarks",
  "collections", "contact", "dashboard", "discover", "docs", "drafts", "explore", "export",
  "favicon.ico", "feed", "forgot-password", "forks", "help", "history", "home", "import",
  "inbox", "legal", "login", "logout", "new", "notifications", "privacy", "profile",
  "register", "reset-password", "robots.txt", "rss", "search", "security", "settings",
  "sign-in", "sign-out", "sign-up", "signin", "signup", "sitemap.xml", "static", "stories",
  "story", "support", "terms", "trending", "u", "user", "users", "well-known", "write",
  "_next", "authowrite", "root", "system", "moderator", "staff",
]);

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns an error message, or null when the username is acceptable. */
export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < 3) return "Use at least 3 characters.";
  if (username.length > 30) return "Use at most 30 characters.";
  if (!USERNAME_PATTERN.test(username))
    return "Use letters, numbers, - or _, starting and ending with a letter or number.";
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved.";
  return null;
}
