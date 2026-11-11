"use client";

import { normalize } from "@workflow-agent/core/engine";
import type { FlowStep } from "@workflow-agent/core/flow-definition";
import { Search } from "lucide-react";
import { forwardRef, useMemo, useState } from "react";
import { STEP_LABELS, describeCheck } from "./model.ts";
import styles from "./editor.module.css";

function searchableText(step: FlowStep) {
  const parts: string[] = [STEP_LABELS[step.type]];
  if (step.type === "message" || step.type === "optionsMenu" || step.type === "question") parts.push(step.text);
  if (step.type === "optionsMenu") parts.push(...step.options.map((option) => option.label));
  if (step.type === "question") parts.push(step.variable);
  if (step.type === "condition") parts.push(...step.rules.map((rule) => describeCheck(rule.when)));
  return parts.join(" ");
}

function preview(step: FlowStep) {
  if (step.type === "message" || step.type === "optionsMenu" || step.type === "question") return step.text;
  if (step.type === "condition") return step.rules.map((rule) => describeCheck(rule.when)).join(" · ") || "Sin reglas";
  return "Fin de la conversación";
}

type Props = { steps: Record<string, FlowStep>; onPick: (stepId: string) => void };

/** Finds a step by its text, options or rules (Ctrl+K) and jumps to it. */
export const StepSearch = forwardRef<HTMLInputElement, Props>(function StepSearch({ steps, onPick }, ref) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const needle = normalize(query);
    return Object.entries(steps)
      .filter(([, step]) => !needle || normalize(searchableText(step)).includes(needle))
      .slice(0, 8);
  }, [query, steps]);

  const pick = (stepId: string) => {
    onPick(stepId);
    setQuery("");
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <div className={styles.search}>
      <Search aria-hidden="true" className={styles.searchIcon} />
      <input
        ref={ref}
        className={styles.searchInput}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="step-search-results"
        aria-activedescendant={open && results[active] ? `step-result-${results[active]![0]}` : undefined}
        aria-label="Buscar un paso"
        placeholder="Buscar paso"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && results[active]) {
            event.preventDefault();
            pick(results[active]![0]);
          } else if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
      />
      <kbd className={`${styles.kbd} ${styles.searchKbd}`}>Ctrl K</kbd>
      {open && results.length > 0 && (
        <ul id="step-search-results" className={styles.searchResults} role="listbox" aria-label="Pasos">
          {results.map(([id, step], index) => (
            <li
              key={id}
              id={`step-result-${id}`}
              role="option"
              aria-selected={index === active}
              className={styles.searchResult}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(id)}
              onMouseEnter={() => setActive(index)}
            >
              <span className={styles.searchType}>{STEP_LABELS[step.type]}</span>
              <span className={styles.searchPreview}>{preview(step)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
