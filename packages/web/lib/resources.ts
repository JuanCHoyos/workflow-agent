import { Resource } from "sst";

/**
 * The SST resources linked to the web app (see sst.config.ts). Typed here so
 * the panel typechecks without a generated sst-env.d.ts from a fresh deploy.
 */
export const linked = Resource as unknown as {
  Businesses: { name: string };
  Conversations: { name: string };
  Auth: { url: string };
};
