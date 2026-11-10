// Pure edits on a Flow draft, used by the visual editor.
import {
  MAX_LIST_OPTIONS,
  type ConditionCheck,
  type DayKey,
  type FlowDefinition,
  type FlowIssue,
  type FlowStep,
} from "@workflow-agent/core/flow-definition";

export type StepType = FlowStep["type"];

/**
 * Handle ids on a node: "next" for a Message or Question, "option-<i>" for each
 * menu option, "rule-<i>" and "otherwise" for a Condition.
 */
export type SourceHandle = "next" | "otherwise" | `option-${number}` | `rule-${number}`;

export const STEP_LABELS: Record<StepType, string> = {
  message: "Mensaje",
  optionsMenu: "Menú de opciones",
  question: "Pregunta",
  condition: "Condición",
  end: "Fin",
};

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_SHORT: Record<DayKey, string> = {
  monday: "lun",
  tuesday: "mar",
  wednesday: "mié",
  thursday: "jue",
  friday: "vie",
  saturday: "sáb",
  sunday: "dom",
};

/** How a Condition rule reads in Spanish, e.g. "ciudad es "Medellín"". */
export function describeCheck(check: ConditionCheck) {
  switch (check.kind) {
    case "variableEquals":
      return `${check.variable || "variable"} es "${check.value}"`;
    case "variableContains":
      return `${check.variable || "variable"} contiene "${check.value}"`;
    case "weekday":
      return check.days.length ? `Día: ${check.days.map((day) => DAY_SHORT[day]).join(", ")}` : "Día: ninguno";
    case "withinBusinessHours":
      return "Dentro del horario de atención";
  }
}

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
  question: () => ({ type: "question", text: "¿Cómo te llamas?", variable: "nombre", next: "" }),
  condition: () => ({
    type: "condition",
    rules: [{ when: { kind: "withinBusinessHours" }, next: "" }],
    otherwise: "",
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

/** Points every handle of `step` that matches `from` to `to`. */
function replaceTargets(step: FlowStep, from: string, to: string): FlowStep {
  const swap = (target: string) => (target === from ? to : target);
  switch (step.type) {
    case "message":
    case "question":
      return { ...step, next: swap(step.next) };
    case "optionsMenu":
      return { ...step, options: step.options.map((option) => ({ ...option, next: swap(option.next) })) };
    case "condition":
      return {
        ...step,
        rules: step.rules.map((rule) => ({ ...rule, next: swap(rule.next) })),
        otherwise: swap(step.otherwise),
      };
    case "end":
      return step;
  }
}

export function removeStep(definition: FlowDefinition, stepId: string): FlowDefinition {
  const steps = Object.fromEntries(
    Object.entries(definition.steps)
      .filter(([id]) => id !== stepId)
      .map(([id, step]) => [id, replaceTargets(step, stepId, "")]),
  );
  const positions = { ...definition.positions };
  delete positions[stepId];
  const startStepId = definition.startStepId === stepId ? (Object.keys(steps)[0] ?? "") : definition.startStepId;
  return { startStepId, steps, positions };
}

const indexOf = (handle: string, prefix: string) => Number(handle.slice(prefix.length));

export function setTarget(
  definition: FlowDefinition,
  sourceId: string,
  handle: SourceHandle,
  targetId: string,
): FlowDefinition {
  const step = definition.steps[sourceId];
  if (!step) return definition;
  let updated: FlowStep = step;
  if ((step.type === "message" || step.type === "question") && handle === "next") {
    updated = { ...step, next: targetId };
  }
  if (step.type === "optionsMenu" && handle.startsWith("option-")) {
    const index = indexOf(handle, "option-");
    updated = { ...step, options: step.options.map((o, i) => (i === index ? { ...o, next: targetId } : o)) };
  }
  if (step.type === "condition" && handle === "otherwise") updated = { ...step, otherwise: targetId };
  if (step.type === "condition" && handle.startsWith("rule-")) {
    const index = indexOf(handle, "rule-");
    updated = { ...step, rules: step.rules.map((r, i) => (i === index ? { ...r, next: targetId } : r)) };
  }
  return { ...definition, steps: { ...definition.steps, [sourceId]: updated } };
}

/** Every connection of a step, as (handle, target) pairs, for drawing edges. */
export function connectionsOf(step: FlowStep): { handle: SourceHandle; target: string }[] {
  switch (step.type) {
    case "message":
    case "question":
      return [{ handle: "next", target: step.next }];
    case "optionsMenu":
      return step.options.map((option, i) => ({ handle: `option-${i}` as const, target: option.next }));
    case "condition":
      return [
        ...step.rules.map((rule, i) => ({ handle: `rule-${i}` as const, target: rule.next })),
        { handle: "otherwise" as const, target: step.otherwise },
      ];
    case "end":
      return [];
  }
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
  if (step.type === "end" || step.type === "condition") return STEP_LABELS[step.type];
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
    case "missingVariable":
      return `${stepName(definition, issue.stepId)} no dice en qué variable guardar la respuesta.`;
    case "unconnected": {
      const step = definition.steps[issue.stepId];
      const name = stepName(definition, issue.stepId);
      if (step?.type === "optionsMenu" && issue.optionIndex !== undefined) {
        return `La opción "${step.options[issue.optionIndex]?.label ?? ""}" de ${name} no lleva a ningún paso.`;
      }
      if (step?.type === "condition" && issue.otherwise) {
        return `La rama "Si no" de ${name} no lleva a ningún paso.`;
      }
      if (step?.type === "condition" && issue.ruleIndex !== undefined) {
        const rule = step.rules[issue.ruleIndex];
        return `La regla "${rule ? describeCheck(rule.when) : ""}" de ${name} no lleva a ningún paso.`;
      }
      return `${name} no lleva a ningún paso.`;
    }
  }
}
