import { createHash } from "node:crypto";
import { issuer } from "@openauthjs/openauth";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { GoogleOidcProvider } from "@openauthjs/openauth/provider/google";
import type { StorageAdapter } from "@openauthjs/openauth/storage/storage";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { subjects } from "./subjects.ts";

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
