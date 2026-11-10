"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./hours.module.css";

/**
 * The hours form's save bar. It sticks above the tab bar on phones, so a
 * one-switch change doesn't need a scroll to save, and says when there are
 * unsaved changes.
 */
export function SaveBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const markDirty = () => setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, []);

  return (
    <div ref={ref} className={styles.saveBar} data-dirty={dirty || undefined}>
      <span className={styles.saveHint} aria-live="polite">
        {dirty ? "Hay cambios sin guardar" : ""}
      </span>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar horario"}
      </button>
    </div>
  );
}
