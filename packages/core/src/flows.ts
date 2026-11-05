import { Entity } from "dynamodb-toolbox/entity";
import { any } from "dynamodb-toolbox/schema/any";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { businessPk } from "./keys.ts";
import type { Tables } from "./tables.ts";

export type MessageStep = { type: "message"; text: string; next: string };
export type OptionsMenuStep = {
  type: "optionsMenu";
  text: string;
  options: readonly { label: string; next: string }[];
};
export type EndStep = { type: "end" };
export type FlowStep = MessageStep | OptionsMenuStep | EndStep;

/** WhatsApp limits: up to 3 reply buttons, up to 10 rows in a list. */
export const MAX_BUTTON_OPTIONS = 3;
export const MAX_LIST_OPTIONS = 10;

export const optionId = (stepId: string, index: number) => `${stepId}:${index}`;

export type FlowDefinition = {
  startStepId: string;
  steps: Record<string, FlowStep>;
};

const flowSk = (flowId: string) => `FLOW#${flowId}`;
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

export class InvalidFlowError extends Error {}

/** Checks that a draft can be published; throws InvalidFlowError with a clear reason. */
export function validateFlow(definition: FlowDefinition) {
  const { steps, startStepId } = definition;
  if (!steps[startStepId]) {
    throw new InvalidFlowError(`The start step "${startStepId}" does not exist`);
  }
  for (const [stepId, step] of Object.entries(steps)) {
    if (step.type === "optionsMenu") {
      if (step.options.length === 0) {
        throw new InvalidFlowError(`Step "${stepId}" has no options`);
      }
      if (step.options.length > MAX_LIST_OPTIONS) {
        throw new InvalidFlowError(
          `Step "${stepId}" has ${step.options.length} options; an OptionsMenu allows at most ${MAX_LIST_OPTIONS}`,
        );
      }
    }
    const targets =
      step.type === "message" ? [step.next] : step.type === "optionsMenu" ? step.options.map((o) => o.next) : [];
    for (const target of targets) {
      if (!steps[target]) {
        throw new InvalidFlowError(`Step "${stepId}" points to a missing step "${target}"`);
      }
    }
  }
}
