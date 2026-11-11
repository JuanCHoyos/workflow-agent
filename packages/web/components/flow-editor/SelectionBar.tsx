"use client";

import {
  AlignHorizontalJustifyStart,
  AlignStartVertical,
  AlignVerticalJustifyStart,
  AlignStartHorizontal,
  Copy,
  CopyPlus,
  Trash2,
  X,
} from "lucide-react";
import styles from "./editor.module.css";

type Props = {
  count: number;
  onAlignLeft: () => void;
  onAlignTop: () => void;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClear: () => void;
};

/** Floating actions for several selected steps. */
export function SelectionBar({
  count,
  onAlignLeft,
  onAlignTop,
  onDistributeHorizontal,
  onDistributeVertical,
  onDuplicate,
  onCopy,
  onDelete,
  onClear,
}: Props) {
  return (
    <div className={styles.selectionBar} role="toolbar" aria-label={`${count} pasos seleccionados`}>
      <span className={styles.selectionCount}>{count} seleccionados</span>
      <span className={styles.barDivider} aria-hidden="true" />
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onAlignLeft} title="Alinear a la izquierda" aria-label="Alinear a la izquierda">
        <AlignStartVertical />
      </button>
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onAlignTop} title="Alinear arriba" aria-label="Alinear arriba">
        <AlignStartHorizontal />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onDistributeHorizontal}
        disabled={count < 3}
        title="Repartir en horizontal"
        aria-label="Repartir en horizontal"
      >
        <AlignHorizontalJustifyStart />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onDistributeVertical}
        disabled={count < 3}
        title="Repartir en vertical"
        aria-label="Repartir en vertical"
      >
        <AlignVerticalJustifyStart />
      </button>
      <span className={styles.barDivider} aria-hidden="true" />
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onDuplicate} title="Duplicar (Ctrl+D)" aria-label="Duplicar">
        <CopyPlus />
      </button>
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onCopy} title="Copiar (Ctrl+C)" aria-label="Copiar">
        <Copy />
      </button>
      <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={onDelete} title="Eliminar (Supr)" aria-label="Eliminar seleccionados">
        <Trash2 />
      </button>
      <span className={styles.barDivider} aria-hidden="true" />
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClear} title="Quitar selección (Esc)" aria-label="Quitar selección">
        <X />
      </button>
    </div>
  );
}
