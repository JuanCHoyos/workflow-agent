// Local auth server for development. Codes are written to a dev mailbox file
// that the web panel shows at /dev/mailbox, instead of being emailed.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { serve } from "@hono/node-server";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { createAuthIssuer } from "./issuer.ts";

const devDir = process.env.DEV_DATA_DIR ?? join(process.cwd(), ".dev");
const mailboxFile = join(devDir, "mailbox.json");
const port = Number(process.env.AUTH_PORT ?? 3001);

mkdirSync(devDir, { recursive: true });

function readMailbox(): { email: string; code: string; sentAt: string }[] {
  try {
    return JSON.parse(readFileSync(mailboxFile, "utf8"));
  } catch {
    return [];
  }
}

const app = createAuthIssuer({
  storage: MemoryStorage({ persist: join(devDir, "auth-storage.json") }),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  async sendCode(email, code) {
    const mailbox = [{ email, code, sentAt: new Date().toISOString() }, ...readMailbox()].slice(0, 20);
    mkdirSync(dirname(mailboxFile), { recursive: true });
    writeFileSync(mailboxFile, JSON.stringify(mailbox, null, 2));
    console.log(`[auth] code for ${email}: ${code}`);
  },
});

serve({ fetch: app.fetch, port });
console.log(`[auth] local issuer listening on http://localhost:${port}`);
