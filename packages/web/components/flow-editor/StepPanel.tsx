"use client";

import { MAX_LIST_OPTIONS, type FlowStep } from "@workflow-agent/core/flow-definition";
import { STEP_LABELS } from "./model.ts";
import styles from "./editor.module.css";

type Props = {
  stepId: string;
  step: FlowStep;
  isStart: boolean;
  onChange: (step: FlowStep) => void;
  onMakeStart: () => void;
  onDelete: () => void;
};

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

      {step.type !== "end" && (
        <label>
          {step.type === "message" ? "Texto del mensaje" : "Pregunta"}
          <textarea
            rows={4}
            value={step.text}
            maxLength={1024}
            onChange={(event) => onChange({ ...step, text: event.target.value })}
          />
        </label>
      )}

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
