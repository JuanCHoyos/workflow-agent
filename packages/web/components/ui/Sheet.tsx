"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
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

const PHONE_QUERY = "(max-width: 899px)";
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.5; // px per ms: a quick flick closes it regardless of distance

function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}

/** Makes everything outside `keep` (and `alsoKeep`) inert; returns an undo. */
function inertOutside(keep: HTMLElement, alsoKeep: (Element | null)[]) {
  const changed: Element[] = [];
  let node: HTMLElement | null = keep;
  while (node && node !== document.body) {
    for (const sibling of Array.from(node.parentElement?.children ?? [])) {
      if (sibling === node || alsoKeep.includes(sibling) || sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
    node = node.parentElement;
  }
  return () => changed.forEach((element) => element.removeAttribute("inert"));
}

/**
 * A side panel on desktop and a modal bottom sheet on phones. On phones it
 * slides up from the bottom edge, traps focus while open (the rest of the page
 * is inert), returns focus to where it came from, can be dragged down by its
 * header to dismiss, and closes with Escape or a tap on the scrim.
 */
export function Sheet({ open, title, onClose, actions, children, label }: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startTime: number; dy: number; pointerId: number } | null>(null);
  const titleId = useId();
  const phone = usePhone();
  const modal = phone && open;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!modal || !sheet) return;
    const opener = document.activeElement as HTMLElement | null;
    const undoInert = inertOutside(sheet, [scrimRef.current]);
    // Focus the sheet itself, not its first field: on phones a focused field
    // would pop the keyboard up over the content the user just opened.
    sheet.focus({ preventScroll: true });
    return () => {
      undoInert();
      opener?.focus?.({ preventScroll: true });
    };
  }, [modal]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!phone || drag.current) return; // ignore extra fingers once a drag started
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
      <div ref={scrimRef} className={styles.scrim} data-open={open || undefined} onClick={onClose} aria-hidden="true" />
      <aside
        ref={sheetRef}
        className={styles.sheet}
        data-open={open || undefined}
        tabIndex={-1}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        aria-labelledby={modal ? titleId : undefined}
        aria-label={modal ? undefined : (label ?? title)}
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
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <div className={styles.actions}>
            {actions}
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onClose}
              aria-label="Cerrar"
              data-sheet-close
            >
              <X />
            </button>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </>
  );
}
