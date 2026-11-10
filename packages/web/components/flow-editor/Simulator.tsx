"use client";

import {
  DEFAULT_TIME_ZONE,
  continueFrom,
  runSteps,
  type ContactInput,
  type Reply,
  type Variables,
} from "@workflow-agent/core/engine";
import type { BusinessHours, FlowDefinition } from "@workflow-agent/core/flow-definition";
import { AlertTriangle, ArrowUp, List, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./simulator.module.css";

type ChatLine = { id: number; author: "contact" | "bot"; text: string; options?: Reply["options"] };

type Props = {
  draft: FlowDefinition;
  hasIssues: boolean;
  businessHours: BusinessHours | null;
};

/**
 * Chats with the draft as a Contact would on WhatsApp. Runs the same pure
 * engine as live Sessions, entirely in the browser: nothing is sent or stored.
 */
export function Simulator({ draft, hasIssues, businessHours }: Props) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [waitingAt, setWaitingAt] = useState<string | null>(null);
  const [variables, setVariables] = useState<Variables>({});
  const [ended, setEnded] = useState(false);
  const [text, setText] = useState("");
  const [openList, setOpenList] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const reset = () => {
    setLines([]);
    setWaitingAt(null);
    setVariables({});
    setEnded(false);
    setOpenList(null);
  };

  const send = (input: ContactInput, shown = input.text) => {
    // A new Session (first message, or after the Flow ended) starts with no variables.
    const context = {
      variables: waitingAt ? variables : {},
      now: new Date(),
      timeZone: DEFAULT_TIME_ZONE,
      businessHours: businessHours ?? undefined,
    };
    const run = waitingAt
      ? continueFrom(draft, waitingAt, input, context)
      : runSteps(draft, draft.startStepId, context);
    setVariables(run.variables);
    setLines((current) => [
      ...current,
      { id: nextId.current++, author: "contact", text: shown },
      ...run.replies.map((reply) => ({ id: nextId.current++, author: "bot" as const, ...reply })),
    ]);
    setWaitingAt(run.waitingAt);
    setEnded(run.waitingAt === null);
    setOpenList(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ text: trimmed });
    setText("");
  };

  const lastBotIndex = lines.reduce((last, line, index) => (line.author === "bot" ? index : last), -1);

  return (
    <div className={styles.simulator}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Prueba el borrador, aunque no esté guardado. No envía mensajes reales.</p>
        <button type="button" className="btn btn-sm btn-ghost" onClick={reset} disabled={lines.length === 0}>
          <RotateCcw aria-hidden="true" />
          Reiniciar
        </button>
      </div>

      {hasIssues && (
        <p className={`notice notice-warning ${styles.warning}`}>
          <AlertTriangle aria-hidden="true" />
          El borrador tiene problemas; la conversación puede cortarse.
        </p>
      )}

      <div className={styles.chat} role="log" aria-live="polite" aria-label="Conversación simulada">
        {lines.length === 0 && (
          <p className={styles.empty}>Escribe como si fueras un cliente. Por ejemplo, "hola".</p>
        )}
        {lines.map((line, index) => (
          <div key={line.id} className={styles.lineGroup} data-author={line.author}>
            <div className={line.author === "contact" ? styles.contact : styles.bot}>{line.text}</div>
            {line.options?.style === "buttons" && (
              <div className={styles.options}>
                {line.options.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.option}
                    disabled={index !== lastBotIndex || ended}
                    onClick={() => send({ text: item.label, selectedOptionId: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {line.options?.style === "list" && (
              <div className={styles.options}>
                <button
                  type="button"
                  className={styles.option}
                  disabled={index !== lastBotIndex || ended}
                  aria-expanded={openList === index}
                  onClick={() => setOpenList(openList === index ? null : index)}
                >
                  <List aria-hidden="true" />
                  Ver opciones
                </button>
                {openList === index && (
                  <ul className={styles.list}>
                    {line.options.items.map((item) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => send({ text: item.label, selectedOptionId: item.id })}>
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
        {ended && lines.length > 0 && (
          <p className={styles.ended}>Fin del Flujo. El próximo mensaje empieza una nueva Sesión.</p>
        )}
        <div ref={bottomRef} />
      </div>

      {Object.keys(variables).length > 0 && (
        <div className={styles.variables} aria-label="Variables de la Sesión">
          {Object.entries(variables).map(([name, value]) => (
            <span key={name} className={styles.variable}>
              {name} = {value}
            </span>
          ))}
        </div>
      )}

      <form className={styles.composer} onSubmit={submit}>
        <label htmlFor="simulator-message" className="sr-only">
          Mensaje del cliente
        </label>
        <input
          id="simulator-message"
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe un mensaje"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className="btn btn-primary btn-icon" aria-label="Enviar" disabled={!text.trim()}>
          <ArrowUp />
        </button>
      </form>
    </div>
  );
}
