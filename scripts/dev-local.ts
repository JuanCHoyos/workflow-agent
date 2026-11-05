// Runs the whole app locally without AWS: DynamoDB Local in Docker, the local
// auth issuer on :3001 and the web panel on :3000. Usage: pnpm dev:local
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { createTables } from "@workflow-agent/core";

const root = join(import.meta.dirname, "..");
const DEV_DATA_DIR = join(root, ".dev");
const DYNAMODB_ENDPOINT = "http://localhost:8000";
const tables = { businesses: "local-Businesses", conversations: "local-Conversations" };

const dynamodb = new DynamoDBClient({
  endpoint: DYNAMODB_ENDPOINT,
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function dynamoIsUp() {
  try {
    await dynamodb.send(new ListTablesCommand({}));
    return true;
  } catch {
    return false;
  }
}

if (!(await dynamoIsUp())) {
  console.log("[dev] starting DynamoDB Local in Docker…");
  execFileSync("docker", [
    "run", "-d", "--rm", "--name", "workflow-agent-dynamodb-local", "-p", "8000:8000",
    "amazon/dynamodb-local", "-jar", "DynamoDBLocal.jar", "-inMemory", "-sharedDb",
  ]);
  while (!(await dynamoIsUp())) await new Promise((resolve) => setTimeout(resolve, 500));
}
await createTables(dynamodb, tables);
mkdirSync(DEV_DATA_DIR, { recursive: true });

const env = {
  ...process.env,
  DEV_DATA_DIR,
  DYNAMODB_ENDPOINT,
  BUSINESSES_TABLE: tables.businesses,
  CONVERSATIONS_TABLE: tables.conversations,
  OPENAUTH_ISSUER_URL: "http://localhost:3001",
};

const node = process.execPath;
const processes = [
  spawn(node, [join(root, "node_modules/tsx/dist/cli.mjs"), "src/auth/local.ts"], {
    cwd: join(root, "packages/functions"),
    env,
    stdio: "inherit",
  }),
  spawn(node, [join(root, "node_modules/next/dist/bin/next"), "dev", "--port", "3000"], {
    cwd: join(root, "packages/web"),
    env,
    stdio: "inherit",
  }),
];

const stop = () => processes.forEach((child) => child.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log("[dev] web on http://localhost:3000 · sign-in codes at http://localhost:3000/dev/mailbox");
