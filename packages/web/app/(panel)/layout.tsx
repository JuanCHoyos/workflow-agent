import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "../../components/shell/AppShell.tsx";
import { BUSINESS_COOKIE, requireUser } from "../../lib/auth.ts";
import { getCore } from "../../lib/core.ts";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const memberships = await getCore().businessesOf(user.userId);
  const selected = (await cookies()).get(BUSINESS_COOKIE)?.value;
  const business = memberships.find((m) => m.businessId === selected) ?? memberships[0];

  return (
    <AppShell email={user.email} businessName={business?.name ?? null}>
      {children}
    </AppShell>
  );
}
