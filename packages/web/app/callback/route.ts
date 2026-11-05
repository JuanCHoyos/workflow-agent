import { NextResponse, type NextRequest } from "next/server";
import { authClient, setTokens } from "../../lib/auth.ts";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const callback = new URL("/callback", request.nextUrl.origin).toString();
  const exchanged = await authClient().exchange(code, callback);
  if (exchanged.err) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  await setTokens(exchanged.tokens.access, exchanged.tokens.refresh);
  return NextResponse.redirect(new URL("/", request.nextUrl.origin));
}
