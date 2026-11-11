"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useEditorActions } from "./EditorActions.tsx";
import styles from "./editor.module.css";

/** A connection with a remove button at its midpoint while it is selected or hovered. */
export function DeletableEdge(props: EdgeProps) {
  const { id, source, sourceHandleId, selected, markerEnd, style } = props;
  const { disconnect } = useEditorActions();
  const [path, labelX, labelY] = getSmoothStepPath({ ...props, borderRadius: 12 });

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={24} />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`nodrag nopan ${styles.edgeButton}`}
          data-visible={selected || undefined}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          aria-label="Quitar conexión"
          title="Quitar conexión"
          onClick={() => sourceHandleId && disconnect(source, sourceHandleId)}
        >
          <X aria-hidden="true" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
