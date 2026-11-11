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

/** Rewrites every outgoing connection of `step` through `map`. */
function mapTargets(step: FlowStep, map: (target: string) => string): FlowStep {
  switch (step.type) {
    case "message":
    case "question":
      return { ...step, next: map(step.next) };
    case "optionsMenu":
      return { ...step, options: step.options.map((option) => ({ ...option, next: map(option.next) })) };
    case "condition":
      return {
        ...step,
        rules: step.rules.map((rule) => ({ ...rule, next: map(rule.next) })),
        otherwise: map(step.otherwise),
      };
    case "end":
      return step;
  }
}

/** Removes the steps and disconnects every connection that pointed to them. */
export function removeSteps(definition: FlowDefinition, stepIds: readonly string[]): FlowDefinition {
  const removed = new Set(stepIds);
  const steps = Object.fromEntries(
    Object.entries(definition.steps)
      .filter(([id]) => !removed.has(id))
      .map(([id, step]) => [id, mapTargets(step, (target) => (removed.has(target) ? "" : target))]),
  );
  const positions = Object.fromEntries(
    Object.entries(definition.positions ?? {}).filter(([id]) => !removed.has(id)),
  );
  const startStepId = removed.has(definition.startStepId) ? (Object.keys(steps)[0] ?? "") : definition.startStepId;
  return { startStepId, steps, positions };
}

export function removeStep(definition: FlowDefinition, stepId: string): FlowDefinition {
  return removeSteps(definition, [stepId]);
}

/** Copied steps: connections inside the selection are kept, the rest are cut. */
export type FlowClipboard = {
  steps: Record<string, FlowStep>;
  positions: Record<string, { x: number; y: number }>;
};

export function copySteps(definition: FlowDefinition, stepIds: readonly string[]): FlowClipboard {
  const chosen = new Set(stepIds.filter((id) => definition.steps[id]));
  const steps: Record<string, FlowStep> = {};
  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of chosen) {
    steps[id] = mapTargets(definition.steps[id]!, (target) => (chosen.has(target) ? target : ""));
    positions[id] = definition.positions?.[id] ?? { x: 0, y: 0 };
  }
  return { steps, positions };
}

/** Pastes copies under fresh ids, rewired to each other, shifted by `offset`. */
export function pasteSteps(definition: FlowDefinition, clipboard: FlowClipboard, offset: { x: number; y: number }) {
  const idMap = new Map<string, string>();
  let working: FlowDefinition = definition;
  for (const oldId of Object.keys(clipboard.steps)) {
    const newId = nextStepId(working);
    idMap.set(oldId, newId);
    // Reserve the id so the next one is different.
    working = { ...working, steps: { ...working.steps, [newId]: { type: "end" } } };
  }
  const steps = { ...definition.steps };
  const positions = { ...definition.positions };
  for (const [oldId, step] of Object.entries(clipboard.steps)) {
    const newId = idMap.get(oldId)!;
    steps[newId] = mapTargets(step, (target) => idMap.get(target) ?? "");
    const at = clipboard.positions[oldId] ?? { x: 0, y: 0 };
    positions[newId] = { x: at.x + offset.x, y: at.y + offset.y };
  }
  const pastedIds = [...idMap.values()];
  const startStepId =
    definition.startStepId && definition.steps[definition.startStepId] ? definition.startStepId : (pastedIds[0] ?? "");
  return { definition: { startStepId, steps, positions }, pastedIds };
}

export type Alignment = "left" | "top";

/** Lines selected steps up on their left edges or top edges. */
export function alignSteps(definition: FlowDefinition, stepIds: readonly string[], alignment: Alignment) {
  const positions = { ...definition.positions };
  const chosen = stepIds.filter((id) => positions[id]);
  if (chosen.length < 2) return definition;
  const axis = alignment === "left" ? "x" : "y";
  const edge = Math.min(...chosen.map((id) => positions[id]![axis]));
  for (const id of chosen) positions[id] = { ...positions[id]!, [axis]: edge };
  return { ...definition, positions };
}

/** Spaces three or more selected steps evenly between the outermost two. */
export function distributeSteps(
  definition: FlowDefinition,
  stepIds: readonly string[],
  direction: "horizontal" | "vertical",
) {
  const positions = { ...definition.positions };
  const axis = direction === "horizontal" ? "x" : "y";
  const chosen = stepIds.filter((id) => positions[id]).sort((a, b) => positions[a]![axis] - positions[b]![axis]);
  if (chosen.length < 3) return definition;
  const first = positions[chosen[0]!]![axis];
  const last = positions[chosen[chosen.length - 1]!]![axis];
  const gap = (last - first) / (chosen.length - 1);
  chosen.forEach((id, index) => {
    positions[id] = { ...positions[id]!, [axis]: Math.round(first + gap * index) };
  });
  return { ...definition, positions };
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
