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
    <div style={{ maxWidth: 460, margin: "0 auto", paddingTop: "var(--space-5)" }}>
      <header className="page-header">
        <h1>Crea tu Negocio</h1>
        <p>Es el nombre que verán tus clientes cuando les escriba tu bot. Puedes cambiarlo después.</p>
      </header>
      <form action={createBusiness} className="stack" style={{ gap: "var(--space-5)" }}>
        <div className="field">
          <label htmlFor="business-name" className="field-label">
            Nombre del Negocio
          </label>
          <input
            id="business-name"
            name="name"
            className="input"
            placeholder="Pizzería Don Tito"
            autoFocus
            required
            maxLength={80}
            autoComplete="organization"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "business-name-error" : undefined}
          />
          {error && (
            <p id="business-name-error" className="notice notice-error" role="alert">
              Escribe el nombre de tu Negocio.
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          Crear Negocio
        </button>
      </form>
    </div>
  );
}
