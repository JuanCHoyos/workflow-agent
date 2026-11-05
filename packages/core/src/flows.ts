import { Entity } from "dynamodb-toolbox/entity";
import { any } from "dynamodb-toolbox/schema/any";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { businessPk } from "./keys.ts";
import type { Tables } from "./tables.ts";

export * from "./flow-definition.ts";

export const FLOW_PREFIX = "FLOW#";
export const flowSk = (flowId: string) => `${FLOW_PREFIX}${flowId}`;
const versionSk = (flowId: string, version: number) =>
  `${flowSk(flowId)}#VERSION#${String(version).padStart(6, "0")}`;

export function flowEntities(tables: Tables) {
  const Flow = new Entity({
    name: "Flow",
    table: tables.businesses,
    schema: item({
      businessId: string().key(),
      flowId: string().key(),
      name: string(),
      draft: any().optional(),
      publishedVersion: number().optional(),
    }),
    computeKey: ({ businessId, flowId }) => ({ pk: businessPk(businessId), sk: flowSk(flowId) }),
  });

  const FlowVersion = new Entity({
    name: "FlowVersion",
    table: tables.businesses,
    schema: item({
      businessId: string().key(),
      flowId: string().key(),
      version: number().key(),
      definition: any(),
    }),
    computeKey: ({ businessId, flowId, version }) => ({
      pk: businessPk(businessId),
      sk: versionSk(flowId, version),
    }),
  });

  return { Flow, FlowVersion };
}
