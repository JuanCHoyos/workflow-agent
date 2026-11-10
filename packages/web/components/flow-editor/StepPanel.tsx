"use client";

import {
  DAY_KEYS,
  MAX_LIST_OPTIONS,
  type ConditionCheck,
  type ConditionStep,
  type FlowStep,
} from "@workflow-agent/core/flow-definition";
import { Flag, Plus, Trash2, X } from "lucide-react";
import { DAY_LABELS } from "./model.ts";
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

function ConditionEditor({
  stepId,
  step,
  onChange,
}: {
  stepId: string;
  step: ConditionStep;
  onChange: (step: FlowStep) => void;
}) {
  const updateRule = (index: number, when: ConditionCheck) =>
    onChange({ ...step, rules: step.rules.map((rule, i) => (i === index ? { ...rule, when } : rule)) });

  return (
    <fieldset className={styles.fieldset}>
      <legend className="field-label">Reglas, en orden</legend>
      <p className="field-hint">Se sigue la primera regla que se cumpla. Si ninguna se cumple, se sigue la rama "Si no".</p>
      <ol className={styles.ruleList}>
        {step.rules.map((rule, index) => {
          const when = rule.when;
          return (
            <li key={index} className={styles.ruleCard}>
              <div className={styles.ruleHead}>
                <label className="sr-only" htmlFor={`${stepId}-rule-${index}`}>
                  Tipo de la regla {index + 1}
                </label>
                <select
                  id={`${stepId}-rule-${index}`}
                  className="select"
                  value={when.kind}
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
                  className="btn btn-ghost btn-icon"
                  aria-label={`Quitar regla ${index + 1}`}
                  onClick={() => onChange({ ...step, rules: step.rules.filter((_, i) => i !== index) })}
                >
                  <X />
                </button>
              </div>
              {(when.kind === "variableEquals" || when.kind === "variableContains") && (
                <div className={styles.ruleInputs}>
                  <input
                    className="input"
                    aria-label="Variable"
                    placeholder="variable"
                    value={when.variable}
                    onChange={(event) => updateRule(index, { ...when, variable: cleanVariable(event.target.value) })}
                  />
                  <input
                    className="input"
                    aria-label="Valor"
                    placeholder="valor"
                    value={when.value}
                    onChange={(event) => updateRule(index, { ...when, value: event.target.value })}
                  />
                </div>
              )}
              {when.kind === "weekday" && (
                <div className={styles.days} role="group" aria-label="Días">
                  {DAY_KEYS.map((day) => {
                    const checked = when.days.includes(day);
                    return (
                      <label key={day} className="chip-toggle">
                        <input
                          type="checkbox"
                          checked={checked}
                          aria-label={DAY_LABELS[day]}
                          onChange={() =>
                            updateRule(index, {
                              kind: "weekday",
                              days: checked
                                ? when.days.filter((d) => d !== day)
                                : DAY_KEYS.filter((d) => d === day || when.days.includes(d)),
                            })
                          }
                        />
                        <span aria-hidden="true">{DAY_LABELS[day].slice(0, 3)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => onChange({ ...step, rules: [...step.rules, { when: emptyCheck("variableEquals"), next: "" }] })}
      >
        <Plus aria-hidden="true" />
        Agregar regla
      </button>
    </fieldset>
  );
}

export function StepPanel({ stepId, step, isStart, onChange, onMakeStart, onDelete }: Props) {
  const textId = `${stepId}-text`;

  return (
    <div className={styles.stepPanel}>
      {step.type === "end" && (
        <p className="secondary">Aquí termina la conversación. El siguiente mensaje del cliente empieza de nuevo.</p>
      )}

      {(step.type === "message" || step.type === "optionsMenu" || step.type === "question") && (
        <div className="field">
          <label htmlFor={textId} className="field-label">
            {step.type === "message" ? "Texto del mensaje" : "Pregunta"}
          </label>
          <textarea
            id={textId}
            className="textarea"
            rows={4}
            value={step.text}
            maxLength={1024}
            aria-describedby={`${textId}-hint`}
            onChange={(event) => onChange({ ...step, text: event.target.value })}
          />
          <p id={`${textId}-hint`} className="field-hint">
            Escribe {"{{nombre}}"} para insertar una respuesta guardada.
          </p>
        </div>
      )}

      {step.type === "question" && (
        <div className="field">
          <label htmlFor={`${stepId}-variable`} className="field-label">
            Guardar la respuesta en
          </label>
          <input
            id={`${stepId}-variable`}
            className={`input ${styles.mono}`}
            value={step.variable}
            maxLength={40}
            placeholder="nombre"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => onChange({ ...step, variable: cleanVariable(event.target.value) })}
          />
        </div>
      )}

      {step.type === "condition" && <ConditionEditor stepId={stepId} step={step} onChange={onChange} />}

      {step.type === "optionsMenu" && (
        <fieldset className={styles.fieldset}>
          <legend className="field-label">
            Opciones · {step.options.length} de {MAX_LIST_OPTIONS}
          </legend>
          <p className="field-hint">Hasta 3 se muestran como botones; de 4 a 10, como lista.</p>
          <ol className={styles.optionList}>
            {step.options.map((option, index) => (
              <li key={index} className={styles.optionRow}>
                <input
                  className="input"
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
                  className="btn btn-ghost btn-icon"
                  aria-label={`Quitar opción ${index + 1}`}
                  onClick={() => onChange({ ...step, options: step.options.filter((_, i) => i !== index) })}
                >
                  <X />
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-sm"
            disabled={step.options.length >= MAX_LIST_OPTIONS}
            onClick={() =>
              onChange({ ...step, options: [...step.options, { label: `Opción ${step.options.length + 1}`, next: "" }] })
            }
          >
            <Plus aria-hidden="true" />
            Agregar opción
          </button>
        </fieldset>
      )}

      <div className={styles.stepFooter}>
        {isStart ? (
          <span className="badge badge-accent">
            <Flag aria-hidden="true" width={12} height={12} />
            Paso inicial
          </span>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost" onClick={onMakeStart}>
            <Flag aria-hidden="true" />
            Hacer paso inicial
          </button>
        )}
        <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          Eliminar paso
        </button>
      </div>
    </div>
  );
}
