"use client";

import { useEffect, useRef } from "react";
import styles from "./editor.module.css";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "Z"], label: "Deshacer" },
  { keys: ["Ctrl", "Shift", "Z"], label: "Rehacer" },
  { keys: ["Ctrl", "C"], label: "Copiar pasos seleccionados" },
  { keys: ["Ctrl", "X"], label: "Cortar pasos seleccionados" },
  { keys: ["Ctrl", "V"], label: "Pegar" },
  { keys: ["Ctrl", "D"], label: "Duplicar" },
  { keys: ["Ctrl", "A"], label: "Seleccionar todos los pasos" },
  { keys: ["Supr"], label: "Eliminar la selección" },
  { keys: ["Shift", "clic"], label: "Agregar o quitar un paso de la selección" },
  { keys: ["Shift", "arrastrar"], label: "Seleccionar con un recuadro" },
  { keys: ["Tab"], label: "Ir de un paso a otro" },
  { keys: ["Enter"], label: "Abrir el paso enfocado" },
  { keys: ["Ctrl", "K"], label: "Buscar un paso" },
  { keys: ["Ctrl", "Shift", "L"], label: "Ordenar automáticamente" },
  { keys: ["Ctrl", "S"], label: "Guardar borrador" },
  { keys: ["?"], label: "Mostrar estos atajos" },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

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
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      style={{ width: "min(520px, calc(100vw - 32px))" }}
    >
      <div className="stack" style={{ gap: "var(--space-4)", padding: "var(--space-5)" }}>
        <h2 id="shortcuts-title">Atajos de teclado</h2>
        <dl className={styles.shortcutList}>
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label} className={styles.shortcutRow}>
              <dt>{label}</dt>
              <dd>
                {keys.map((key) => (
                  <kbd key={key} className={styles.kbd}>
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="secondary" style={{ fontSize: "0.875rem" }}>
          En el celular: toca el botón de selección para elegir varios pasos con el dedo, y mantén presionado un paso para
          ver sus acciones.
        </p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            Entendido
          </button>
        </div>
      </div>
    </dialog>
  );
}
