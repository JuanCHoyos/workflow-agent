import type { ReactNode } from "react";

export const metadata = { title: "Workflow Agent · Admin" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
