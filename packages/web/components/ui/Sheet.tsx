"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import styles from "./sheet.module.css";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
  /** Accessible label of the region when docked on desktop. */
  label?: string;
};

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.5; // px per ms: a quick flick closes it regardless of distance

/**
 * A side panel on desktop and a bottom sheet on phones. On phones it slides
 * up from the bottom edge, can be dragged down by its header to dismiss, and
 * closes with Escape or a tap on the scrim.
 */
export function Sheet({ open, title, onClose, actions, children, label }: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startTime: number; dy: number; pointerId: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isPhone = () => window.matchMedia("(max-width: 899px)").matches;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPhone() || drag.current) return; // ignore extra fingers once a drag started
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startTime: performance.now(), dy: 0, pointerId: event.pointerId };
    sheetRef.current?.setAttribute("data-dragging", "");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const sheet = sheetRef.current;
    if (!state || !sheet || event.pointerId !== state.pointerId) return;
    const dy = event.clientY - state.startY;
    // Resist dragging up past the resting position instead of stopping hard.
    state.dy = dy > 0 ? dy : -Math.sqrt(-dy) * 2;
    sheet.style.transform = `translateY(${state.dy}px)`;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const sheet = sheetRef.current;
    if (!state || !sheet || event.pointerId !== state.pointerId) return;
    drag.current = null;
    sheet.removeAttribute("data-dragging");
    const velocity = state.dy / Math.max(1, performance.now() - state.startTime);
    sheet.style.transform = "";
    if (state.dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) onClose();
  };

  return (
    <>
      <div className={styles.scrim} data-open={open || undefined} onClick={onClose} aria-hidden="true" />
      <aside
        ref={sheetRef}
        className={styles.sheet}
        data-open={open || undefined}
        aria-label={label ?? title}
        aria-hidden={!open || undefined}
        inert={!open || undefined}
      >
        <div
          className={styles.header}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className={styles.handle} aria-hidden="true" />
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.actions}>
            {actions}
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Cerrar">
              <X />
            </button>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </>
  );
}
