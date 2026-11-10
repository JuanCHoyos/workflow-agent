import { ArrowRight, Clock, MessageCircle, Workflow } from "lucide-react";
import Link from "next/link";
import { requireMember } from "../../lib/auth.ts";
import styles from "./home.module.css";

const ROLE_LABELS = { owner: "Propietario", admin: "Administrador", support: "Atención" } as const;

export default async function HomePage() {
  const { business, businessName } = await requireMember();
  const [conversations, flows, hours] = await Promise.all([
    business.listConversations(),
    business.member.role === "support" ? Promise.resolve([]) : business.listFlows(),
    business.getBusinessHours(),
  ]);
  const mainFlow = flows.find((flow) => flow.isMain);

  const nextStep = !mainFlow
    ? {
        title: flows.length === 0 ? "Crea el primer Flujo de tu bot" : "Elige tu Flujo principal",
        body:
          flows.length === 0
            ? "Arma la conversación con la que tu bot recibe a cada cliente y pruébala en el simulador."
            : "Publica uno de tus Flujos y márcalo como principal para que responda a tus clientes.",
        href: "/flows",
        action: flows.length === 0 ? "Crear Flujo" : "Ir a Flujos",
      }
    : !hours
      ? {
          title: "Configura tu horario de atención",
          body: "Así tu bot puede responder distinto cuando no hay nadie atendiendo.",
          href: "/settings/hours",
          action: "Configurar horario",
        }
      : null;

  return (
    <div className={styles.home}>
      <header className="page-header">
        <h1>{businessName}</h1>
        <p>Entraste como {ROLE_LABELS[business.member.role]}.</p>
      </header>

      {nextStep && (
        <section className={styles.next} aria-labelledby="next-step-title">
          <div className={styles.nextText}>
            <h2 id="next-step-title">{nextStep.title}</h2>
            <p className="secondary">{nextStep.body}</p>
          </div>
          <Link href={nextStep.href} className="btn btn-primary">
            {nextStep.action}
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      )}

      <section aria-labelledby="status-title" className={styles.section}>
        <h2 id="status-title">Estado</h2>
        <ul className={styles.status}>
          <li>
            <Workflow aria-hidden="true" />
            <div>
              <span className={styles.statusLabel}>Flujo principal</span>
              {mainFlow ? (
                <Link href={`/flows/${mainFlow.id}`} className={styles.statusValue}>
                  {mainFlow.name}
                  <span className="badge badge-success">Versión {mainFlow.publishedVersion}</span>
                </Link>
              ) : (
                <span className={styles.statusValue}>Sin Flujo principal</span>
              )}
            </div>
          </li>
          <li>
            <Clock aria-hidden="true" />
            <div>
              <span className={styles.statusLabel}>Horario de atención</span>
              <Link href="/settings/hours" className={styles.statusValue}>
                {hours ? "Configurado" : "Sin configurar"}
              </Link>
            </div>
          </li>
          <li>
            <MessageCircle aria-hidden="true" />
            <div>
              <span className={styles.statusLabel}>Conversaciones</span>
              <span className={styles.statusValue}>
                {conversations.length === 0 ? "Ninguna todavía" : conversations.length}
              </span>
            </div>
          </li>
        </ul>
        {conversations.length === 0 && (
          <p className={styles.hint}>
            Las conversaciones aparecerán aquí cuando conectes WhatsApp. Mientras tanto, prueba tus Flujos en el
            simulador del editor.
          </p>
        )}
      </section>
    </div>
  );
}
