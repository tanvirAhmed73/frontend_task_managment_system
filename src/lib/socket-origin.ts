/**
 * Socket.IO base URL: same host as REST, without /api.
 * Override with NEXT_PUBLIC_SOCKET_ORIGIN if needed.
 */
export function getSocketOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (api) {
    const base = api.replace(/\/$/, "");
    return base.replace(/\/api\/?$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4000";
  }
  return "";
}
