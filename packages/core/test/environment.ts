import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  createCore,
  type Channel,
  type Clock,
  type Core,
  type FlowDefinition,
  type OutboundMessage,
} from "../src/index.ts";

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
  set(date: Date | string) {
    this.current = new Date(date);
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

/** Creates a Business whose main Flow is the given definition, already published. */
export async function createBusinessWithMainFlow(
  core: Core,
  definition: FlowDefinition,
  name = "Negocio de prueba",
) {
  const { id: businessId } = await core.createBusiness({ name });
  const business = core.business(businessId);
  const { id: flowId } = await business.createFlow({ name: "Principal" });
  await business.saveFlowDraft(flowId, definition);
  await business.publishFlow(flowId);
  await business.setMainFlow(flowId);
  return { businessId, business, flowId };
}

/** A main Flow that only sends one Message and ends. */
export const singleMessageFlow = (text: string): FlowDefinition => ({
  startStepId: "greeting",
  steps: {
    greeting: { type: "message", text, next: "end" },
    end: { type: "end" },
  },
});
