import Link from "next/link";
import { requireEditor } from "../../../lib/editor-access.ts";
import { createFlowAction, deleteFlowAction } from "./actions.ts";
import styles from "./flows.module.css";

export default async function FlowsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { business } = await requireEditor();
  const flows = (await business.listFlows()).sort((a, b) => Number(b.isMain) - Number(a.isMain));
  const { error } = await searchParams;

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <div>
        <h1>Flujos</h1>
        <p className="muted">
          Un Flujo es la conversación que sigue tu bot. El Flujo principal responde a cada cliente
          que te escribe.
        </p>
      </div>

      {error === "delete-main" && (
        <p className="error">No puedes borrar el Flujo principal. Elige otro como principal primero.</p>
      )}

      <form action={createFlowAction} className={`card ${styles.create}`}>
        <label style={{ flex: 1 }}>
          Nuevo Flujo
          <input name="name" placeholder="Bienvenida, Fuera de horario…" maxLength={80} />
        </label>
        <button type="submit" className="primary">
          Crear Flujo
        </button>
      </form>

      {flows.length === 0 ? (
        <div className="card muted">Todavía no tienes Flujos. Crea el primero para empezar.</div>
      ) : (
        <ul className={styles.list}>
          {flows.map((flow) => (
            <li key={flow.id} className={`card ${styles.item}`}>
              <div className="stack" style={{ gap: "0.25rem" }}>
                <div className="row" style={{ gap: "0.5rem" }}>
                  <Link href={`/flows/${flow.id}`} className={styles.name}>
                    {flow.name}
                  </Link>
                  {flow.isMain && <span className="badge">Principal</span>}
                </div>
                <span className="muted">
                  {flow.publishedVersion
                    ? `Publicado · versión ${flow.publishedVersion}`
                    : "Sin publicar"}
                </span>
              </div>
              <div className="spacer" />
              <Link href={`/flows/${flow.id}`} className="button">
                Editar
              </Link>
              {!flow.isMain && (
                <form action={deleteFlowAction}>
                  <input type="hidden" name="flowId" value={flow.id} />
                  <button type="submit" aria-label={`Borrar ${flow.name}`}>
                    Borrar
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
