import { notFound } from "next/navigation";
import { requireMember } from "./auth.ts";

/** Flows are configuration: only the owner and admins can open the editor. */
export async function requireEditor() {
  const context = await requireMember();
  if (context.business.member.role === "support") notFound();
  return context;
}
