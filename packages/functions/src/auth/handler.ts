// Auth issuer Lambda deployed by sst.aws.Auth. Storage comes from OPENAUTH_STORAGE.
import { handle } from "hono/aws-lambda";
import { createAuthIssuer } from "./issuer.ts";

const app = createAuthIssuer({
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  async sendCode(email, code) {
    // TODO(#4): deliver through Amazon SES once a sending domain is verified.
    console.log(`[auth] code requested for ${email}: ${code}`);
  },
});

export const handler = handle(app);
