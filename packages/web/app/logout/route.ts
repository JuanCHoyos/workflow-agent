import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "../../lib/auth.ts";

export async function POST(request: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
