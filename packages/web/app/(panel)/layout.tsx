import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "../../lib/auth.ts";
import styles from "./panel.module.css";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Workflow Agent
        </Link>
        <nav className={styles.nav}>
          <Link href="/">Inicio</Link>
          <Link href="/flows">Flujos</Link>
        </nav>
        <div className="spacer" />
        <span className="muted">{user.email}</span>
        <form action="/logout" method="post">
          <button type="submit">Salir</button>
        </form>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
