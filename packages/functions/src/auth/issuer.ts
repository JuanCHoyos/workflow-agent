import { createHash } from "node:crypto";
import { issuer } from "@openauthjs/openauth";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { GoogleOidcProvider } from "@openauthjs/openauth/provider/google";
import type { StorageAdapter } from "@openauthjs/openauth/storage/storage";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import type { Theme } from "@openauthjs/openauth/ui/theme";
import { subjects } from "./subjects.ts";

const BRAND_MARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#b85a38"/><path d="M9 11.5A3.5 3.5 0 0 1 12.5 8h7A3.5 3.5 0 0 1 23 11.5v4a3.5 3.5 0 0 1-3.5 3.5H15l-4 3.5V19.3A3.5 3.5 0 0 1 9 16Z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="13.5" r="1.3" fill="#fff"/><circle cx="19" cy="13.5" r="1.3" fill="#fff"/></svg>`,
)}`;

/** The sign-in screen wears the panel's palette: warm dark grounds and the clay accent. */
const SIGN_IN_THEME: Theme = {
  title: "Workflow Agent",
  logo: BRAND_MARK,
  favicon: BRAND_MARK,
  radius: "md",
  primary: "#b85a38",
  background: { dark: "#262624", light: "#f5f4ee" },
  font: { family: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', scale: "1.05" },
  css: `
    [data-component="center"] { padding-inline: 24px; box-sizing: border-box; width: 100%; max-width: 420px; }
    @media (prefers-color-scheme: dark) {
      [data-component="input"] { background: #1c1b1a; border-color: rgb(222 220 209 / 24%); color: #faf9f5; }
      [data-component="input"]::placeholder { color: #a8a69d; }
      [data-component="form-footer"] { color: #c2c0b6; }
    }
    @media (prefers-color-scheme: light) {
      [data-component="input"]::placeholder { color: #6b6a64; }
      [data-component="form-footer"] { color: #4d4c48; }
    }
  `,
};

export type AuthIssuerOptions = {
  /** Omit to let OpenAuth read it from OPENAUTH_STORAGE (set by SST in AWS). */
  storage?: StorageAdapter;
  /** Delivers the one-time code to the user's email. */
  sendCode: (email: string, code: string) => Promise<void>;
  /** Google sign-in is enabled only when its OAuth client is configured. */
  googleClientId?: string;
};

/** A stable user id derived from the email, so every provider maps to the same user. */
export function userIdFor(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function createAuthIssuer({ storage, sendCode, googleClientId }: AuthIssuerOptions) {
  const code = CodeProvider(
    CodeUI({
      sendCode: async (claims, code) => sendCode(claims.email ?? "", code),
      copy: {
        email_placeholder: "Tu correo",
        email_invalid: "Escribe un correo válido",
        button_continue: "Continuar",
        code_info: "Te enviaremos un código a tu correo",
        code_placeholder: "Código",
        code_invalid: "El código no es válido",
        code_sent: "Enviamos un código a ",
        code_resent: "Reenviamos el código a ",
        code_didnt_get: "¿No te llegó el código?",
        code_resend: "Reenviar",
      },
    }),
  );
  const google = googleClientId
    ? GoogleOidcProvider({ clientID: googleClientId, scopes: ["openid", "email"] })
    : undefined;

  return issuer({
    subjects,
    theme: SIGN_IN_THEME,
    ...(storage && { storage }),
    providers: google ? { code, google } : { code },
    async success(ctx, value) {
      const email =
        value.provider === "code" ? value.claims.email : (value.id as { email?: string }).email;
      if (!email) throw new Error("The provider did not return an email");
      const normalized = email.trim().toLowerCase();
      return ctx.subject("user", { userId: userIdFor(normalized), email: normalized });
    },
  });
}
