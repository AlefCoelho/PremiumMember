import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminByEmail, getAffiliateByEmail } from "@/lib/db";

const COOKIE_NAME = "sp_session";
const AFFILIATE_COOKIE_NAME = "sp_affiliate_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

type SessionPayload = {
  adminId: number;
  email: string;
};

type AffiliateSessionPayload = {
  affiliateId: number;
  email: string;
  code: string;
};

export async function createSession(email: string, password: string) {
  const admin = getAdminByEmail(email);
  if (!admin) return false;

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return false;

  const token = jwt.sign({ adminId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: "7d" });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return true;
}

export async function createAffiliateSession(email: string, password: string) {
  const affiliate = getAffiliateByEmail(email);
  if (!affiliate || affiliate.status !== "active") return false;
  if (!affiliate.password_hash) return false;

  const valid = await bcrypt.compare(password, affiliate.password_hash);
  if (!valid) return false;

  const token = jwt.sign(
    { affiliateId: affiliate.id, email: affiliate.email, code: affiliate.code },
    JWT_SECRET,
    { expiresIn: "14d" }
  );
  const cookieStore = await cookies();
  cookieStore.set(AFFILIATE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return true;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function destroyAffiliateSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AFFILIATE_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getAffiliateSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AFFILIATE_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AffiliateSessionPayload;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAffiliate() {
  const session = await getAffiliateSession();
  if (!session) redirect("/socio/login");
  return session;
}
