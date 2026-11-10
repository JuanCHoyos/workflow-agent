// Pure Flow execution: given a definition, where a Session is and its context,
// decide what to reply and where it waits next. No I/O, so the live engine and
// the simulator run exactly the same rules.
import {
  DAY_KEYS,
  MAX_BUTTON_OPTIONS,
  optionId,
  type BusinessHours,
  type ConditionCheck,
  type DayKey,
  type FlowDefinition,
  type FlowStep,
  type OptionsMenuStep,
} from "./flow-definition.ts";
import type { OutboundOptions } from "./ports.ts";

export type Reply = { text: string; options?: OutboundOptions };

export type Variables = Record<string, string>;

/** Where the Flow stopped (a waiting step, or null when it ended) and the Session's variables. */
export type RunResult = { replies: Reply[]; waitingAt: string | null; variables: Variables };

export type ContactInput = { text: string; selectedOptionId?: string };

/** Everything outside the definition that steps may depend on. */
export type RunContext = {
  variables: Variables;
  now: Date;
  timeZone: string;
  businessHours?: BusinessHours;
};

export const DEFAULT_TIME_ZONE = "America/Bogota";

/** Lowercase, trimmed and without accents, so "  RESERVAR " matches "Reservar". */
export function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

/** Replaces {{variable}} with its value; unknown variables become empty. */
export function interpolate(text: string, variables: Variables) {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name: string) => variables[name] ?? "");
}

export function optionsMenuReply(stepId: string, step: OptionsMenuStep, variables: Variables = {}): Reply {
  return {
    text: interpolate(step.text, variables),
    options: {
      style: step.options.length <= MAX_BUTTON_OPTIONS ? "buttons" : "list",
      items: step.options.map((option, index) => ({ id: optionId(stepId, index), label: option.label })),
    },
  };
}

/** The weekday and "HH:MM" time of `now` in the given time zone. */
export function localTime(now: Date, timeZone: string): { day: DayKey; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = get("weekday").toLowerCase() as DayKey;
  return { day: DAY_KEYS.includes(day) ? day : "monday", time: `${get("hour")}:${get("minute")}` };
}

export function isWithinBusinessHours(context: RunContext) {
  const { day, time } = localTime(context.now, context.timeZone);
  return (context.businessHours?.[day] ?? []).some((range) => range.open <= time && time < range.close);
}

function holds(check: ConditionCheck, context: RunContext) {
  switch (check.kind) {
    case "variableEquals":
      return normalize(context.variables[check.variable] ?? "") === normalize(check.value);
    case "variableContains":
      return normalize(context.variables[check.variable] ?? "").includes(normalize(check.value));
    case "weekday":
      return check.days.includes(localTime(context.now, context.timeZone).day);
    case "withinBusinessHours":
      return isWithinBusinessHours(context);
  }
}

/** Safety net against Conditions that loop back on themselves without waiting. */
const MAX_STEPS_PER_RUN = 100;

/** Runs steps from `stepId` until the Flow ends or waits for the Contact. */
export function runSteps(definition: FlowDefinition, stepId: string, context: RunContext): RunResult {
  const replies: Reply[] = [];
  const { variables } = context;
  let current: string | undefined = stepId;
  for (let count = 0; current && count < MAX_STEPS_PER_RUN; count++) {
    const step: FlowStep | undefined = definition.steps[current];
    if (!step || step.type === "end") break;
    if (step.type === "optionsMenu") {
      replies.push(optionsMenuReply(current, step, variables));
      return { replies, waitingAt: current, variables };
    }
    if (step.type === "question") {
      replies.push({ text: interpolate(step.text, variables) });
      return { replies, waitingAt: current, variables };
    }
    if (step.type === "condition") {
      current = step.rules.find((rule) => holds(rule.when, context))?.next ?? step.otherwise;
      continue;
    }
    replies.push({ text: interpolate(step.text, variables) });
    current = step.next;
  }
  return { replies, waitingAt: null, variables };
}

/**
 * Answers a Contact's message in a Session waiting at `stepId`: stores a
 * Question's answer, follows the chosen option, or shows the OptionsMenu again
 * when nothing matches.
 */
export function continueFrom(
  definition: FlowDefinition,
  stepId: string,
  input: ContactInput,
  context: RunContext,
): RunResult {
  const step = definition.steps[stepId];
  if (step?.type === "question") {
    const variables = { ...context.variables, [step.variable]: input.text.trim() };
    return runSteps(definition, step.next, { ...context, variables });
  }
  if (step?.type !== "optionsMenu") return runSteps(definition, stepId, context);
  const typed = normalize(input.text);
  const option = step.options.find(
    (candidate, index) =>
      input.selectedOptionId === optionId(stepId, index) || normalize(candidate.label) === typed,
  );
  if (!option) {
    return { replies: [optionsMenuReply(stepId, step, context.variables)], waitingAt: stepId, variables: context.variables };
  }
  return runSteps(definition, option.next, context);
}
