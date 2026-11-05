import { createClient } from "@openauthjs/openauth/client";
import { NotAMemberError } from "@workflow-agent/core";
import { subjects } from "@workflow-agent/functions/auth/subjects";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Resource } from "sst";
import { getCore } from "./core.ts";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
export const BUSINESS_COOKIE = "business_id";

function issuerUrl() {
  return process.env.OPENAUTH_ISSUER_URL ?? Resource.Auth.url;
}

export const authClient = () => createClient({ clientID: "web", issuer: issuerUrl() });

export type SignedInUser = { userId: string; email: string };

export async function setTokens(access: string, refresh: string) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  } as const;
  jar.set(ACCESS_COOKIE, access, options);
  jar.set(REFRESH_COOKIE, refresh, options);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  jar.delete(BUSINESS_COOKIE);
}

/** The signed-in user, or null. Expired access tokens are refreshed on the fly. */
export async function currentUser(): Promise<SignedInUser | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  const verified = await authClient().verify(subjects, access, {
    refresh: jar.get(REFRESH_COOKIE)?.value,
  });
  if (verified.err) return null;
  return verified.subject.properties;
}

export async function requireUser(): Promise<SignedInUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Resolves the Business and the acting Member for this request. Every panel
 * page goes through here before touching core, so a user can only ever act
 * on a Business they belong to.
 */
export async function requireMember() {
  const user = await requireUser();
  const core = getCore();
  const memberships = await core.businessesOf(user.userId);
  if (memberships.length === 0) redirect("/onboarding");

  const selected = (await cookies()).get(BUSINESS_COOKIE)?.value;
  const businessId = memberships.some((m) => m.businessId === selected)
    ? selected!
    : memberships[0]!.businessId;
  try {
    const business = await core.asMember(businessId, user.userId);
    const name = memberships.find((m) => m.businessId === businessId)!.name;
    return { user, business, businessName: name, memberships };
  } catch (error) {
    if (error instanceof NotAMemberError) redirect("/onboarding");
    throw error;
  }
}
