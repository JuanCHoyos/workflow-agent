import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { createCore, type Core, type TableNames } from "@workflow-agent/core";
import { linked } from "./resources.ts";

/** Table names come from env vars locally and from SST links in AWS. */
function tableNames(): TableNames {
  if (process.env.BUSINESSES_TABLE && process.env.CONVERSATIONS_TABLE) {
    return {
      businesses: process.env.BUSINESSES_TABLE,
      conversations: process.env.CONVERSATIONS_TABLE,
    };
  }
  return { businesses: linked.Businesses.name, conversations: linked.Conversations.name };
}

function dynamoClient() {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  return endpoint
    ? new DynamoDBClient({
        endpoint,
        region: "local",
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      })
    : new DynamoDBClient({});
}

let instance: Core | undefined;

/** The web panel never sends messages to Contacts yet, so its Channel only logs. */
export function getCore(): Core {
  instance ??= createCore({
    dynamodb: dynamoClient(),
    tables: tableNames(),
    clock: { now: () => new Date() },
    channel: {
      async send(message) {
        console.warn("[web] channel not configured, dropping message", message.phone);
      },
    },
  });
  return instance;
}
