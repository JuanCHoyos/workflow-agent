import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
    <main style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }} className="stack">
      <h1>Buzón de desarrollo</h1>
      <p className="muted">
        En local los códigos de acceso no se envían por correo: aparecen aquí. Recarga la página
        después de pedir un código.
      </p>
      {mails.length === 0 ? (
        <p className="card muted">Todavía no hay códigos.</p>
      ) : (
        mails.map((mail) => (
          <div key={mail.sentAt} className="card row">
            <div className="stack" style={{ gap: 0 }}>
              <strong>{mail.email}</strong>
              <span className="muted">{new Date(mail.sentAt).toLocaleString("es-CO")}</span>
            </div>
            <div className="spacer" />
            <code style={{ fontSize: "1.5rem", letterSpacing: "0.2em" }}>{mail.code}</code>
          </div>
        ))
      )}
    </main>
  );
}
