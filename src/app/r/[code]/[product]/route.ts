import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAffiliateByCode, getCopyShieldSignupUrl, getTradeShieldSignupUrl, recordAffiliateClick } from "@/lib/db";

const productTargets = {
  copyshieldpro: getCopyShieldSignupUrl,
  tradeshield: getTradeShieldSignupUrl,
} as const;

type ProductSlug = keyof typeof productTargets;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

function isProductSlug(value: string): value is ProductSlug {
  return value in productTargets;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; product: string }> }
) {
  const { code, product } = await params;
  const productSlug = decodeURIComponent(product).trim().toLowerCase();

  if (!isProductSlug(productSlug)) {
    return new NextResponse("Produto de afiliado invalido.", { status: 404 });
  }

  const normalizedCode = decodeURIComponent(code).trim().toUpperCase();
  const affiliate = getAffiliateByCode(normalizedCode);

  if (!affiliate || affiliate.status !== "active") {
    return new NextResponse("Link de afiliado invalido ou inativo.", { status: 404 });
  }

  const target = new URL(productTargets[productSlug]());
  const clickUid = `pm_${randomUUID()}`;

  target.searchParams.set("pm_product", productSlug);
  target.searchParams.set("pm_ref", affiliate.code);
  target.searchParams.set("pm_affiliate_id", String(affiliate.id));
  target.searchParams.set("pm_click_id", clickUid);
  target.searchParams.set("ref", affiliate.code);
  target.searchParams.set("affiliate_id", String(affiliate.id));
  target.searchParams.set("utm_source", "premium_member");
  target.searchParams.set("utm_medium", "affiliate");
  target.searchParams.set("utm_campaign", affiliate.code);
  target.searchParams.set("utm_content", clickUid);

  recordAffiliateClick({
    affiliateId: affiliate.id,
    clickUid,
    productSlug,
    affiliateCode: affiliate.code,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    sourceUrl: request.headers.get("referer"),
    targetUrl: target.toString(),
  });

  const response = NextResponse.redirect(target);
  response.cookies.set("sp_ref", affiliate.code, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("sp_click_id", clickUid, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("sp_product", productSlug, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
