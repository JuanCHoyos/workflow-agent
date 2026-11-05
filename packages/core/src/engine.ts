// Pure Flow execution: given a definition and where a Session is, decide what
// to reply and where it waits next. No I/O, so the live engine and the
// simulator run exactly the same rules.
import {
  MAX_BUTTON_OPTIONS,
  optionId,
  type FlowDefinition,
  type FlowStep,
  type OptionsMenuStep,
} from "./flow-definition.ts";
import type { OutboundOptions } from "./ports.ts";

export type Reply = { text: string; options?: OutboundOptions };

/** Where the Flow stopped: waiting at an OptionsMenu, or null when it ended. */
export type RunResult = { replies: Reply[]; waitingAt: string | null };

export type ContactInput = { text: string; selectedOptionId?: string };

/** Lowercase, trimmed and without accents, so "  RESERVAR " matches "Reservar". */
export function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

export function optionsMenuReply(stepId: string, step: OptionsMenuStep): Reply {
  return {
    text: step.text,
    options: {
      style: step.options.length <= MAX_BUTTON_OPTIONS ? "buttons" : "list",
      items: step.options.map((option, index) => ({ id: optionId(stepId, index), label: option.label })),
    },
  };
}

/** Runs steps from `stepId` until the Flow ends or waits at an OptionsMenu. */
export function runSteps(definition: FlowDefinition, stepId: string): RunResult {
  const replies: Reply[] = [];
  let current: string | undefined = stepId;
  while (current) {
    const step: FlowStep | undefined = definition.steps[current];
    if (!step || step.type === "end") break;
    if (step.type === "optionsMenu") {
      replies.push(optionsMenuReply(current, step));
      return { replies, waitingAt: current };
    }
    replies.push({ text: step.text });
    current = step.next;
  }
  return { replies, waitingAt: null };
}

/**
 * Answers a Contact's message in a Session waiting at `stepId`: follows the
 * chosen option, or shows the OptionsMenu again when nothing matches.
 */
export function continueFrom(definition: FlowDefinition, stepId: string, input: ContactInput): RunResult {
  const step = definition.steps[stepId];
  if (step?.type !== "optionsMenu") return runSteps(definition, stepId);
  const typed = normalize(input.text);
  const option = step.options.find(
    (candidate, index) =>
      input.selectedOptionId === optionId(stepId, index) || normalize(candidate.label) === typed,
  );
  if (!option) return { replies: [optionsMenuReply(stepId, step)], waitingAt: stepId };
  return runSteps(definition, option.next);
}
