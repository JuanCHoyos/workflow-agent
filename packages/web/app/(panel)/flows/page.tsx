import { ChevronRight, Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { requireEditor } from "../../../lib/editor-access.ts";
import { createFlowAction } from "./actions.ts";
import { DeleteFlowButton } from "./DeleteFlowButton.tsx";
import styles from "./flows.module.css";

export default async function FlowsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { business } = await requireEditor();
  const flows = (await business.listFlows()).sort(
    (a, b) => Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name, "es"),
  );
  const { error } = await searchParams;

  return (
    <div className="stack" style={{ gap: "var(--space-6)" }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <h1>Flujos</h1>
        <p>Un Flujo es la conversación que sigue tu bot. El Flujo principal responde a cada cliente que te escribe.</p>
      </header>

      {error === "delete-main" && (
        <p className="notice notice-error" role="alert">
          No puedes borrar el Flujo principal. Elige otro como principal primero.
        </p>
      )}

      <form action={createFlowAction} className={styles.create}>
        <label htmlFor="new-flow-name" className="sr-only">
          Nombre del nuevo Flujo
        </label>
        <input
          id="new-flow-name"
          name="name"
          className="input"
          placeholder="Nombre del nuevo Flujo, por ejemplo Bienvenida"
          maxLength={80}
        />
        <button type="submit" className="btn btn-primary">
          <Plus aria-hidden="true" />
          Crear Flujo
        </button>
      </form>

      {flows.length === 0 ? (
        <div className={styles.empty}>
          <Workflow aria-hidden="true" />
          <h2>Crea tu primer Flujo</h2>
          <p className="secondary">
            Empieza con un saludo y un menú de opciones. Lo puedes probar en el simulador antes de que lo vea algún
            cliente.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {flows.map((flow) => (
            <li key={flow.id} className={styles.item}>
              <Link href={`/flows/${flow.id}`} className={styles.link}>
                <span className={styles.name}>{flow.name}</span>
                <span className={styles.meta}>
                  {flow.isMain && <span className="badge badge-accent">Principal</span>}
                  {flow.publishedVersion ? (
                    <span className="badge badge-success">Publicado · v{flow.publishedVersion}</span>
                  ) : (
                    <span className="badge">Sin publicar</span>
                  )}
                </span>
                <ChevronRight aria-hidden="true" className={styles.chevron} />
              </Link>
              {!flow.isMain && <DeleteFlowButton flowId={flow.id} flowName={flow.name} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
