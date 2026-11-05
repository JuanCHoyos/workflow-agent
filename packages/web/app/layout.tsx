import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Workflow Agent" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
