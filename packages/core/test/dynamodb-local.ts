import { execFileSync } from "node:child_process";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { createTables } from "../src/index.ts";
import { ENDPOINT, TEST_TABLE_NAMES, createLocalClient } from "./environment.ts";

const CONTAINER = "workflow-agent-dynamodb-local";

async function isAvailable(client: DynamoDBClient) {
  try {
    await client.send(new ListTablesCommand({}));
    return true;
  } catch {
    return false;
  }
}

/** Starts DynamoDB Local in Docker unless DYNAMODB_ENDPOINT points to a running one. */
export default async function setup() {
  const client = createLocalClient();
  if (!(await isAvailable(client))) {
    if (process.env.DYNAMODB_ENDPOINT) {
      throw new Error(`DynamoDB Local is not responding at ${ENDPOINT}`);
    }
    execFileSync("docker", [
      "run", "-d", "--rm", "--name", CONTAINER, "-p", "8000:8000",
      "amazon/dynamodb-local", "-jar", "DynamoDBLocal.jar", "-inMemory", "-sharedDb",
    ]);
    for (let attempt = 0; !(await isAvailable(client)); attempt++) {
      if (attempt > 60) throw new Error("DynamoDB Local did not start in time");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  await createTables(client, TEST_TABLE_NAMES);
}
