// What a Flow is, independent of storage. Safe to import from the browser.

export type MessageStep = { type: "message"; text: string; next: string };
export type OptionsMenuStep = {
  type: "optionsMenu";
  text: string;
  options: readonly { label: string; next: string }[];
};
export type EndStep = { type: "end" };
export type FlowStep = MessageStep | OptionsMenuStep | EndStep;

export type FlowDefinition = {
  startStepId: string;
  steps: Record<string, FlowStep>;
  /** Where each step sits in the visual editor. Ignored when running the Flow. */
  positions?: Record<string, { x: number; y: number }>;
};

/** WhatsApp limits: up to 3 reply buttons, up to 10 rows in a list. */
export const MAX_BUTTON_OPTIONS = 3;
export const MAX_LIST_OPTIONS = 10;

export const optionId = (stepId: string, index: number) => `${stepId}:${index}`;

export type FlowIssue =
  | { code: "missingStart" }
  | { code: "noOptions"; stepId: string }
  | { code: "tooManyOptions"; stepId: string; count: number }
  | { code: "unconnected"; stepId: string; optionIndex?: number };

/** Every reason the draft cannot be published, in step order. */
export function findFlowIssues(definition: FlowDefinition): FlowIssue[] {
  const { steps, startStepId } = definition;
  const issues: FlowIssue[] = [];
  if (!steps[startStepId]) issues.push({ code: "missingStart" });
  for (const [stepId, step] of Object.entries(steps)) {
    if (step.type === "message" && !steps[step.next]) {
      issues.push({ code: "unconnected", stepId });
    }
    if (step.type === "optionsMenu") {
      if (step.options.length === 0) issues.push({ code: "noOptions", stepId });
      if (step.options.length > MAX_LIST_OPTIONS) {
        issues.push({ code: "tooManyOptions", stepId, count: step.options.length });
      }
      step.options.forEach((option, optionIndex) => {
        if (!steps[option.next]) issues.push({ code: "unconnected", stepId, optionIndex });
      });
    }
  }
  return issues;
}

export class InvalidFlowError extends Error {}

function describe(issue: FlowIssue, definition: FlowDefinition) {
  switch (issue.code) {
    case "missingStart":
      return `The start step "${definition.startStepId}" does not exist`;
    case "noOptions":
      return `Step "${issue.stepId}" has no options`;
    case "tooManyOptions":
      return `Step "${issue.stepId}" has ${issue.count} options; an OptionsMenu allows at most ${MAX_LIST_OPTIONS}`;
    case "unconnected": {
      const step = definition.steps[issue.stepId];
      const target =
        step?.type === "message"
          ? step.next
          : step?.type === "optionsMenu"
            ? step.options[issue.optionIndex ?? 0]?.next
            : "";
      return `Step "${issue.stepId}" points to a missing step "${target}"`;
    }
  }
}

/** Checks that a draft can be published; throws InvalidFlowError with the first reason. */
export function validateFlow(definition: FlowDefinition) {
  const [first] = findFlowIssues(definition);
  if (first) throw new InvalidFlowError(describe(first, definition));
}
