"use client";

import { Clock, House, LogOut, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./shell.module.css";

const NAV = [
  { href: "/", label: "Inicio", icon: House, match: (path: string) => path === "/" },
  { href: "/flows", label: "Flujos", icon: Workflow, match: (path: string) => path.startsWith("/flows") },
  { href: "/settings/hours", label: "Horario", icon: Clock, match: (path: string) => path.startsWith("/settings") },
];

type Props = { email: string; businessName: string | null; children: ReactNode };

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className={styles.mark}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path
        d="M9 11.5A3.5 3.5 0 0 1 12.5 8h7A3.5 3.5 0 0 1 23 11.5v4a3.5 3.5 0 0 1-3.5 3.5H15l-4 3.5V19.3A3.5 3.5 0 0 1 9 16Z"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="13.5" r="1.3" fill="#fff" />
      <circle cx="19" cy="13.5" r="1.3" fill="#fff" />
    </svg>
  );
}

export function AppShell({ email, businessName, children }: Props) {
  const pathname = usePathname();
  const inEditor = /^\/flows\/[^/]+/.test(pathname);
  const pageTitle = NAV.find((item) => item.match(pathname))?.label ?? "Workflow Agent";

  return (
    <div className={styles.shell} data-editor={inEditor || undefined}>
      <a href="#main" className={styles.skip}>
        Ir al contenido
      </a>

      <aside className={styles.sidebar} aria-label="Navegación principal">
        <Link href="/" className={styles.brand}>
          <BrandMark />
          <span>Workflow Agent</span>
        </Link>
        {businessName && (
          <div className={styles.business}>
            <span className={styles.businessLabel}>Negocio</span>
            <span className={styles.businessName}>{businessName}</span>
          </div>
        )}
        <nav className={styles.nav}>
          {NAV.map(({ href, label, icon: Icon, match }) => (
            <Link key={href} href={href} className={styles.navItem} aria-current={match(pathname) ? "page" : undefined}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.account}>
          <span className={styles.email} title={email}>
            {email}
          </span>
          <form action="/logout" method="post">
            <button type="submit" className="btn btn-ghost btn-icon btn-sm" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut />
            </button>
          </form>
        </div>
      </aside>

      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Workflow Agent, inicio">
          <BrandMark />
        </Link>
        <span className={styles.topbarTitle}>{pageTitle}</span>
        <form action="/logout" method="post">
          <button type="submit" className="btn btn-ghost btn-icon" aria-label="Cerrar sesión">
            <LogOut />
          </button>
        </form>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      <nav className={styles.tabbar} aria-label="Navegación principal">
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} className={styles.tab} aria-current={match(pathname) ? "page" : undefined}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
