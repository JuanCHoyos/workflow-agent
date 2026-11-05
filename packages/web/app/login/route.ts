import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "../../lib/auth.ts";

export async function GET(request: NextRequest) {
  const callback = new URL("/callback", request.nextUrl.origin).toString();
  const { url } = await authClient().authorize(callback, "code");
  return NextResponse.redirect(url);
}
