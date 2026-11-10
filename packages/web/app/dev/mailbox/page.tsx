import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Inbox } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type DevMail = { email: string; code: string; sentAt: string };

/** Development only: shows the sign-in codes the local auth server "sent". */
export default async function DevMailboxPage() {
  if (!process.env.DEV_DATA_DIR) notFound();

  let mails: DevMail[] = [];
  try {
    mails = JSON.parse(await readFile(join(process.env.DEV_DATA_DIR, "mailbox.json"), "utf8"));
  } catch {
    mails = [];
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "var(--space-7) var(--space-4)" }}>
      <header className="page-header">
        <h1>Buzón de desarrollo</h1>
        <p>En local los códigos de acceso no se envían por correo: aparecen aquí. Recarga después de pedir uno.</p>
      </header>
      {mails.length === 0 ? (
        <div className="notice notice-warning">
          <Inbox aria-hidden="true" />
          Todavía no hay códigos.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface)",
          }}
        >
          {mails.map((mail, index) => (
            <li
              key={mail.sentAt}
              className="row"
              style={{
                padding: "var(--space-4)",
                borderTop: index === 0 ? "none" : "1px solid var(--border)",
                flexWrap: "wrap",
              }}
            >
              <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <strong style={{ overflowWrap: "anywhere" }}>{mail.email}</strong>
                <span className="muted" style={{ fontSize: "0.875rem" }}>
                  {new Date(mail.sentAt).toLocaleString("es-CO")}
                </span>
              </div>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.5rem",
                  letterSpacing: "0.18em",
                  fontVariantNumeric: "tabular-nums",
                  color: index === 0 ? "var(--accent-text)" : "var(--text-muted)",
                }}
              >
                {mail.code}
              </code>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
