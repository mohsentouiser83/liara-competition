export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
    return originUrl.host === forwardedHost && originUrl.protocol === `${forwardedProtocol}:`;
  } catch {
    return false;
  }
}
