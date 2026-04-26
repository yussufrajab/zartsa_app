/**
 * Parse and clamp pagination parameters from query strings.
 * Ensures page is >= 1 and limit is between 1 and 100.
 */
export function parsePagination(query: Record<string, string | string[] | undefined>) {
  const page = Math.max(1, parseInt(String(query.page)) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit)) || 20));
  return { page, limit };
}