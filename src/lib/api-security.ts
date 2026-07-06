import { NextRequest } from "next/server";

export function validateInternalApiSecret(request: NextRequest) {
  const expected = (process.env.PREMIUM_MEMBER_API_SECRET ?? "").trim();
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  const headerSecret = request.headers.get("x-premium-member-secret") ?? "";
  return bearer === expected || headerSecret === expected;
}

export function validateWebhookSecret(request: NextRequest) {
  const expected = (process.env.INFINITEPAY_WEBHOOK_SECRET ?? "").trim();
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  const headerSecret = request.headers.get("x-infinitepay-secret") ?? "";
  const querySecret = request.nextUrl.searchParams.get("secret") ?? "";
  return bearer === expected || headerSecret === expected || querySecret === expected;
}
