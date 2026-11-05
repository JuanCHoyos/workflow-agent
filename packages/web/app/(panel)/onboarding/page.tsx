import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BUSINESS_COOKIE, requireUser } from "../../../lib/auth.ts";
import { getCore } from "../../../lib/core.ts";

async function createBusiness(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/onboarding?error=name");
  const { id } = await getCore().createBusinessWithOwner({ name, owner: user });
  (await cookies()).set(BUSINESS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const memberships = await getCore().businessesOf(user.userId);
  if (memberships.length > 0) redirect("/");
  const { error } = await searchParams;

  return (
    <div style={{ maxWidth: 440, margin: "3rem auto" }} className="card stack">
      <h1>Crea tu Negocio</h1>
      <p className="muted">Así lo verán tus clientes cuando les escriba tu bot.</p>
      <form action={createBusiness} className="stack">
        <label>
          Nombre del Negocio
          <input name="name" placeholder="Pizzería Don Tito" autoFocus required maxLength={80} />
        </label>
        {error && <p className="error">Escribe el nombre de tu Negocio.</p>}
        <button type="submit" className="primary">
          Crear Negocio
        </button>
      </form>
    </div>
  );
}
