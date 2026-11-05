import Link from "next/link";
import { requireMember } from "../../lib/auth.ts";

const ROLE_LABELS = { owner: "Propietario", admin: "Administrador", support: "Atención" } as const;

export default async function HomePage() {
  const { business, businessName } = await requireMember();
  const conversations = await business.listConversations();

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <div>
        <h1>{businessName}</h1>
        <p className="muted">
          Entraste como {ROLE_LABELS[business.member.role]}.
        </p>
      </div>
      <div className="card stack">
        <h2>Tu bot</h2>
        <p className="muted">
          Arma el Flujo que responde a tus clientes por WhatsApp y pruébalo en el simulador antes de
          publicarlo.
        </p>
        <div>
          <Link href="/flows" className="button primary">
            Ir a Flujos
          </Link>
        </div>
      </div>
      <div className="card">
        <h2>Conversaciones</h2>
        <p className="muted">
          {conversations.length === 0
            ? "Todavía no hay conversaciones. Aparecerán aquí cuando conectes WhatsApp."
            : `${conversations.length} conversaciones`}
        </p>
      </div>
    </div>
  );
}
