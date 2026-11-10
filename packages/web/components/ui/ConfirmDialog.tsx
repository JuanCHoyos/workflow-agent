"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * A native <dialog>: focus is trapped and restored by the browser, Escape
 * closes it, and the backdrop is part of the platform. Use only for actions
 * that cannot be undone. Destructive dialogs focus Cancel first.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  destructive,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // The dialog has no padding, so a click on the element itself is the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="stack" style={{ gap: "var(--space-4)", padding: "var(--space-5)" }}>
        <h2 id={titleId}>{title}</h2>
        {children && (
          <div id={bodyId} className="secondary">
            {children}
          </div>
        )}
        <div className="row" style={{ justifyContent: "flex-end", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} autoFocus={destructive}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? "btn-danger-strong" : "btn-primary"}`}
            disabled={pending}
            onClick={onConfirm}
            autoFocus={!destructive}
          >
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
