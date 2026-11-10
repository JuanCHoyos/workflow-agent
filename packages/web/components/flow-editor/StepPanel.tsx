"use client";

import {
  DAY_KEYS,
  MAX_LIST_OPTIONS,
  type ConditionCheck,
  type ConditionStep,
  type FlowStep,
} from "@workflow-agent/core/flow-definition";
import { DAY_LABELS, STEP_LABELS } from "./model.ts";
import styles from "./editor.module.css";

type Props = {
  stepId: string;
  step: FlowStep;
  isStart: boolean;
  onChange: (step: FlowStep) => void;
  onMakeStart: () => void;
  onDelete: () => void;
};

const CHECK_LABELS: Record<ConditionCheck["kind"], string> = {
  variableEquals: "Una variable es igual a…",
  variableContains: "Una variable contiene…",
  weekday: "Es uno de estos días…",
  withinBusinessHours: "Estamos en horario de atención",
};

function emptyCheck(kind: ConditionCheck["kind"]): ConditionCheck {
  switch (kind) {
    case "variableEquals":
    case "variableContains":
      return { kind, variable: "", value: "" };
    case "weekday":
      return { kind, days: ["saturday", "sunday"] };
    case "withinBusinessHours":
      return { kind };
  }
}

/** Variable names are used as {{name}}: letters, digits, dots, dashes and underscores. */
const cleanVariable = (value: string) => value.replace(/[^\w.-]/g, "");

function ConditionEditor({ step, onChange }: { step: ConditionStep; onChange: (step: FlowStep) => void }) {
  const updateRule = (index: number, when: ConditionCheck) =>
    onChange({ ...step, rules: step.rules.map((rule, i) => (i === index ? { ...rule, when } : rule)) });

  return (
    <div className="stack">
      <span className={styles.panelLabel}>Reglas, en orden</span>
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        Se sigue la primera regla que se cumpla. Si ninguna se cumple, se sigue la rama "Si no".
      </p>
      {step.rules.map((rule, index) => (
        <div key={index} className={styles.ruleCard}>
          <div className="row" style={{ gap: "0.5rem" }}>
            <select
              aria-label={`Tipo de la regla ${index + 1}`}
              value={rule.when.kind}
              onChange={(event) => updateRule(index, emptyCheck(event.target.value as ConditionCheck["kind"]))}
            >
              {(Object.keys(CHECK_LABELS) as ConditionCheck["kind"][]).map((kind) => (
                <option key={kind} value={kind}>
                  {CHECK_LABELS[kind]}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`Quitar regla ${index + 1}`}
              onClick={() => onChange({ ...step, rules: step.rules.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
          {(rule.when.kind === "variableEquals" || rule.when.kind === "variableContains") && (
            <div className="row" style={{ gap: "0.5rem" }}>
              <input
                aria-label="Variable"
                placeholder="variable"
                value={rule.when.variable}
                onChange={(event) =>
                  rule.when.kind !== "weekday" &&
                  rule.when.kind !== "withinBusinessHours" &&
                  updateRule(index, { ...rule.when, variable: cleanVariable(event.target.value) })
                }
              />
              <input
                aria-label="Valor"
                placeholder="valor"
                value={rule.when.value}
                onChange={(event) =>
                  rule.when.kind !== "weekday" &&
                  rule.when.kind !== "withinBusinessHours" &&
                  updateRule(index, { ...rule.when, value: event.target.value })
                }
              />
            </div>
          )}
          {rule.when.kind === "weekday" && (
            <div className={styles.days}>
              {DAY_KEYS.map((day) => {
                const days = rule.when.kind === "weekday" ? rule.when.days : [];
                const checked = days.includes(day);
                return (
                  <label key={day} className={styles.dayToggle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        updateRule(index, {
                          kind: "weekday",
                          days: checked ? days.filter((d) => d !== day) : DAY_KEYS.filter((d) => d === day || days.includes(d)),
                        })
                      }
                    />
                    {DAY_LABELS[day].slice(0, 3)}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...step, rules: [...step.rules, { when: emptyCheck("variableEquals"), next: "" }] })}
      >
        + Agregar regla
      </button>
    </div>
  );
}

export function StepPanel({ step, isStart, onChange, onMakeStart, onDelete }: Props) {
  return (
    <aside className={styles.panel}>
      <div className="row">
        <h2 style={{ margin: 0 }}>{STEP_LABELS[step.type]}</h2>
        <div className="spacer" />
        {isStart ? (
          <span className="badge">Paso inicial</span>
        ) : (
          <button type="button" onClick={onMakeStart}>
            Hacer inicial
          </button>
        )}
      </div>

      {step.type === "end" && (
        <p className="muted">Aquí termina la conversación. El siguiente mensaje del cliente empieza de nuevo.</p>
      )}

      {(step.type === "message" || step.type === "optionsMenu" || step.type === "question") && (
        <label>
          {step.type === "message" ? "Texto del mensaje" : "Pregunta"}
          <textarea
            rows={4}
            value={step.text}
            maxLength={1024}
            onChange={(event) => onChange({ ...step, text: event.target.value })}
          />
          <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem" }}>
            Usa {"{{variable}}"} para insertar una respuesta guardada, por ejemplo {"{{nombre}}"}.
          </span>
        </label>
      )}

      {step.type === "question" && (
        <label>
          Guardar la respuesta en la variable
          <input
            value={step.variable}
            maxLength={40}
            placeholder="nombre"
            onChange={(event) => onChange({ ...step, variable: cleanVariable(event.target.value) })}
          />
        </label>
      )}

      {step.type === "condition" && <ConditionEditor step={step} onChange={onChange} />}

      {step.type === "optionsMenu" && (
        <div className="stack">
          <span className={styles.panelLabel}>
            Opciones ({step.options.length}/{MAX_LIST_OPTIONS})
          </span>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Hasta 3 opciones se muestran como botones; de 4 a 10, como lista.
          </p>
          {step.options.map((option, index) => (
            <div key={index} className="row" style={{ gap: "0.5rem" }}>
              <input
                value={option.label}
                maxLength={24}
                aria-label={`Opción ${index + 1}`}
                onChange={(event) =>
                  onChange({
                    ...step,
                    options: step.options.map((o, i) => (i === index ? { ...o, label: event.target.value } : o)),
                  })
                }
              />
              <button
                type="button"
                aria-label={`Quitar opción ${index + 1}`}
                onClick={() => onChange({ ...step, options: step.options.filter((_, i) => i !== index) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({ ...step, options: [...step.options, { label: `Opción ${step.options.length + 1}`, next: "" }] })
            }
          >
            + Agregar opción
          </button>
        </div>
      )}

      <div className="spacer" />
      <button type="button" onClick={onDelete} className={styles.danger}>
        Eliminar paso
      </button>
    </aside>
  );
}
