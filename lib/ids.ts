const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checked before querying, because Postgres rejects malformed uuids with an error instead of "no rows". */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Share-link tokens: 18 random bytes, URL-safe base64 (24 characters). */
export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{24}$/.test(value);
}
