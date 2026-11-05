import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { createCore, type Channel, type Clock, type OutboundMessage } from "../src/index.ts";

export const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";

export const TEST_TABLE_NAMES = {
  businesses: "test-Businesses",
  conversations: "test-Conversations",
};

export function createLocalClient() {
  return new DynamoDBClient({
    endpoint: ENDPOINT,
    region: "local",
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });
}

export class FakeChannel implements Channel {
  sent: OutboundMessage[] = [];
  async send(message: OutboundMessage) {
    this.sent.push(message);
  }
}

export class FakeClock implements Clock {
  constructor(private current = new Date("2026-11-05T15:00:00Z")) {}
  now() {
    return this.current;
  }
  advance(minutes: number) {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}

export function createTestEnvironment() {
  const channel = new FakeChannel();
  const clock = new FakeClock();
  const core = createCore({
    dynamodb: createLocalClient(),
    tables: TEST_TABLE_NAMES,
    channel,
    clock,
  });
  return { core, channel, clock };
}
