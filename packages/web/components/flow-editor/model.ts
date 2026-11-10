// Pure edits on a Flow draft, used by the visual editor.
import {
  MAX_LIST_OPTIONS,
  type FlowDefinition,
  type FlowIssue,
  type FlowStep,
} from "@workflow-agent/core/flow-definition";

export type StepType = FlowStep["type"];

/** Handle ids on a node: "next" for a Message, "option-<i>" for each menu option. */
export type SourceHandle = "next" | `option-${number}`;

export const STEP_LABELS: Record<StepType, string> = {
  message: "Mensaje",
  optionsMenu: "Menú de opciones",
  end: "Fin",
};

function nextStepId(definition: FlowDefinition) {
  let index = Object.keys(definition.steps).length + 1;
  while (definition.steps[`paso-${index}`]) index++;
  return `paso-${index}`;
}

const NEW_STEPS: Record<StepType, () => FlowStep> = {
  message: () => ({ type: "message", text: "Nuevo mensaje", next: "" }),
  optionsMenu: () => ({
    type: "optionsMenu",
    text: "¿Qué quieres hacer?",
    options: [
      { label: "Opción 1", next: "" },
      { label: "Opción 2", next: "" },
    ],
  }),
  end: () => ({ type: "end" }),
};

export function addStep(definition: FlowDefinition, type: StepType, position: { x: number; y: number }) {
  const id = nextStepId(definition);
  return {
    id,
    definition: {
      ...definition,
      startStepId: definition.startStepId && definition.steps[definition.startStepId] ? definition.startStepId : id,
      steps: { ...definition.steps, [id]: NEW_STEPS[type]() },
      positions: { ...definition.positions, [id]: position },
    },
  };
}

function retarget(step: FlowStep, removedId: string): FlowStep {
  if (step.type === "message") return step.next === removedId ? { ...step, next: "" } : step;
  if (step.type === "optionsMenu") {
    return {
      ...step,
      options: step.options.map((option) => (option.next === removedId ? { ...option, next: "" } : option)),
    };
  }
  return step;
}

export function removeStep(definition: FlowDefinition, stepId: string): FlowDefinition {
  const steps = Object.fromEntries(
    Object.entries(definition.steps)
      .filter(([id]) => id !== stepId)
      .map(([id, step]) => [id, retarget(step, stepId)]),
  );
  const positions = { ...definition.positions };
  delete positions[stepId];
  const startStepId = definition.startStepId === stepId ? (Object.keys(steps)[0] ?? "") : definition.startStepId;
  return { startStepId, steps, positions };
}

export function setTarget(
  definition: FlowDefinition,
  sourceId: string,
  handle: SourceHandle,
  targetId: string,
): FlowDefinition {
  const step = definition.steps[sourceId];
  if (!step) return definition;
  let updated: FlowStep = step;
  if (step.type === "message" && handle === "next") updated = { ...step, next: targetId };
  if (step.type === "optionsMenu" && handle.startsWith("option-")) {
    const index = Number(handle.slice("option-".length));
    updated = {
      ...step,
      options: step.options.map((option, i) => (i === index ? { ...option, next: targetId } : option)),
    };
  }
  return { ...definition, steps: { ...definition.steps, [sourceId]: updated } };
}

export function updateStep(definition: FlowDefinition, stepId: string, step: FlowStep): FlowDefinition {
  return { ...definition, steps: { ...definition.steps, [stepId]: step } };
}

export function moveStep(definition: FlowDefinition, stepId: string, position: { x: number; y: number }) {
  return { ...definition, positions: { ...definition.positions, [stepId]: position } };
}

/** A short name for a step, for issue messages: its type and the start of its text. */
export function stepName(definition: FlowDefinition, stepId: string) {
  const step = definition.steps[stepId];
  if (!step) return stepId;
  if (step.type === "end") return STEP_LABELS.end;
  const preview = step.text.length > 28 ? `${step.text.slice(0, 28)}…` : step.text;
  return `${STEP_LABELS[step.type]} "${preview}"`;
}

export function describeIssue(issue: FlowIssue, definition: FlowDefinition) {
  switch (issue.code) {
    case "missingStart":
      return "El Flujo no tiene paso inicial. Agrega un paso.";
    case "noOptions":
      return `${stepName(definition, issue.stepId)} no tiene opciones.`;
    case "tooManyOptions":
      return `${stepName(definition, issue.stepId)} tiene ${issue.count} opciones; el máximo es ${MAX_LIST_OPTIONS}.`;
    case "unconnected": {
      const step = definition.steps[issue.stepId];
      if (step?.type === "optionsMenu" && issue.optionIndex !== undefined) {
        const label = step.options[issue.optionIndex]?.label ?? "";
        return `La opción "${label}" de ${stepName(definition, issue.stepId)} no lleva a ningún paso.`;
      }
      return `${stepName(definition, issue.stepId)} no lleva a ningún paso.`;
    }
  }
}
