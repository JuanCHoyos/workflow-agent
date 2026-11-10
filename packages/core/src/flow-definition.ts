// What a Flow is, independent of storage. Safe to import from the browser.

export type MessageStep = { type: "message"; text: string; next: string };
export type OptionsMenuStep = {
  type: "optionsMenu";
  text: string;
  options: readonly { label: string; next: string }[];
};
/** Asks something and stores the Contact's answer in a variable. */
export type QuestionStep = { type: "question"; text: string; variable: string; next: string };

export const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type ConditionCheck =
  | { kind: "variableEquals"; variable: string; value: string }
  | { kind: "variableContains"; variable: string; value: string }
  | { kind: "weekday"; days: readonly DayKey[] }
  | { kind: "withinBusinessHours" };

/** Follows the first rule that holds, or `otherwise` when none does. */
export type ConditionStep = {
  type: "condition";
  rules: readonly { when: ConditionCheck; next: string }[];
  otherwise: string;
};
export type EndStep = { type: "end" };
export type FlowStep = MessageStep | OptionsMenuStep | QuestionStep | ConditionStep | EndStep;

export type FlowDefinition = {
  startStepId: string;
  steps: Record<string, FlowStep>;
  /** Where each step sits in the visual editor. Ignored when running the Flow. */
  positions?: Record<string, { x: number; y: number }>;
};

/** Opening ranges per day, as "HH:MM" in the Business's time zone. */
export type BusinessHours = Record<DayKey, readonly { open: string; close: string }[]>;

/** WhatsApp limits: up to 3 reply buttons, up to 10 rows in a list. */
export const MAX_BUTTON_OPTIONS = 3;
export const MAX_LIST_OPTIONS = 10;

export const optionId = (stepId: string, index: number) => `${stepId}:${index}`;

export type FlowIssue =
  | { code: "missingStart" }
  | { code: "noOptions"; stepId: string }
  | { code: "tooManyOptions"; stepId: string; count: number }
  | { code: "missingVariable"; stepId: string }
  | { code: "unconnected"; stepId: string; optionIndex?: number; ruleIndex?: number; otherwise?: true };

/** Every reason the draft cannot be published, in step order. */
export function findFlowIssues(definition: FlowDefinition): FlowIssue[] {
  const { steps, startStepId } = definition;
  const issues: FlowIssue[] = [];
  const exists = (target: string) => Boolean(steps[target]);
  if (!exists(startStepId)) issues.push({ code: "missingStart" });
  for (const [stepId, step] of Object.entries(steps)) {
    if (step.type === "message" && !exists(step.next)) {
      issues.push({ code: "unconnected", stepId });
    }
    if (step.type === "question") {
      if (!step.variable.trim()) issues.push({ code: "missingVariable", stepId });
      if (!exists(step.next)) issues.push({ code: "unconnected", stepId });
    }
    if (step.type === "optionsMenu") {
      if (step.options.length === 0) issues.push({ code: "noOptions", stepId });
      if (step.options.length > MAX_LIST_OPTIONS) {
        issues.push({ code: "tooManyOptions", stepId, count: step.options.length });
      }
      step.options.forEach((option, optionIndex) => {
        if (!exists(option.next)) issues.push({ code: "unconnected", stepId, optionIndex });
      });
    }
    if (step.type === "condition") {
      step.rules.forEach((rule, ruleIndex) => {
        if (!exists(rule.next)) issues.push({ code: "unconnected", stepId, ruleIndex });
      });
      if (!exists(step.otherwise)) issues.push({ code: "unconnected", stepId, otherwise: true });
    }
  }
  return issues;
}

export class InvalidFlowError extends Error {}

function missingTarget(issue: Extract<FlowIssue, { code: "unconnected" }>, step: FlowStep | undefined) {
  if (!step) return "";
  if (step.type === "message" || step.type === "question") return step.next;
  if (step.type === "optionsMenu") return step.options[issue.optionIndex ?? 0]?.next ?? "";
  if (step.type === "condition") {
    return issue.otherwise ? step.otherwise : (step.rules[issue.ruleIndex ?? 0]?.next ?? "");
  }
  return "";
}

function describe(issue: FlowIssue, definition: FlowDefinition) {
  switch (issue.code) {
    case "missingStart":
      return `The start step "${definition.startStepId}" does not exist`;
    case "noOptions":
      return `Step "${issue.stepId}" has no options`;
    case "tooManyOptions":
      return `Step "${issue.stepId}" has ${issue.count} options; an OptionsMenu allows at most ${MAX_LIST_OPTIONS}`;
    case "missingVariable":
      return `Step "${issue.stepId}" does not say which variable stores the answer`;
    case "unconnected":
      return `Step "${issue.stepId}" points to a missing step "${missingTarget(issue, definition.steps[issue.stepId])}"`;
  }
}

/** Checks that a draft can be published; throws InvalidFlowError with the first reason. */
export function validateFlow(definition: FlowDefinition) {
  const [first] = findFlowIssues(definition);
  if (first) throw new InvalidFlowError(describe(first, definition));
}
