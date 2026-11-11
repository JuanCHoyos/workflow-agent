"use client";

import type { FlowStep } from "@workflow-agent/core/flow-definition";
import { Handle, NodeToolbar, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  CopyPlus,
  Diamond,
  HelpCircle,
  ListChecks,
  MessageSquare,
  Pencil,
  Square,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEditorActions } from "./EditorActions.tsx";
import { memo } from "react";
import { STEP_LABELS, describeCheck } from "./model.ts";
import styles from "./editor.module.css";

export type StepNodeData = { step: FlowStep; isStart: boolean; hasIssue: boolean; isActive?: boolean };
export type StepNodeType = Node<StepNodeData, "step">;

const ICONS: Record<FlowStep["type"], LucideIcon> = {
  message: MessageSquare,
  optionsMenu: ListChecks,
  question: HelpCircle,
  condition: Diamond,
  end: Square,
};

function Branch({ id, label, muted }: { id: string; label: string; muted?: boolean }) {
  return (
    <li className={`${styles.nodeOption} ${muted ? styles.nodeOptionMuted : ""}`}>
      <span>{label}</span>
      <Handle id={id} type="source" position={Position.Right} className={styles.handle} />
    </li>
  );
}

function StepNodeView({ id, data, selected }: NodeProps<StepNodeType>) {
  const { step, isStart, hasIssue, isActive } = data;
  const { openStep, duplicateSteps, removeSteps, selectionSize } = useEditorActions();
  const Icon = ICONS[step.type];
  const classes = [styles.node, styles[`node_${step.type}`], selected && styles.nodeSelected, hasIssue && styles.nodeIssue, isActive && styles.nodeActive]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <NodeToolbar isVisible={selected && selectionSize === 1} position={Position.Top} offset={10}>
        <div className={styles.nodeToolbar} role="toolbar" aria-label="Acciones del paso">
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => openStep(id)} aria-label="Editar paso" title="Editar">
            <Pencil />
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => duplicateSteps([id])} aria-label="Duplicar paso" title="Duplicar (Ctrl+D)">
            <CopyPlus />
          </button>
          <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => removeSteps([id])} aria-label="Eliminar paso" title="Eliminar (Supr)">
            <Trash2 />
          </button>
        </div>
      </NodeToolbar>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <Icon aria-hidden="true" />
        <span>{STEP_LABELS[step.type]}</span>
        {isActive && <span className={styles.activeBadge}>Simulando</span>}
        {isStart && <span className={styles.startBadge}>Inicio</span>}
      </div>
      {(step.type === "message" || step.type === "optionsMenu" || step.type === "question") && (
        <p className={styles.nodeText}>{step.text || "Sin texto"}</p>
      )}
      {step.type === "question" && <p className={styles.nodeVariable}>Guarda en {`{{${step.variable || "?"}}}`}</p>}
      {(step.type === "message" || step.type === "question") && (
        <Handle id="next" type="source" position={Position.Right} className={styles.handle} />
      )}
      {step.type === "optionsMenu" && (
        <ul className={styles.nodeOptions}>
          {step.options.map((option, index) => (
            <Branch key={index} id={`option-${index}`} label={option.label || `Opción ${index + 1}`} />
          ))}
        </ul>
      )}
      {step.type === "condition" && (
        <ul className={styles.nodeOptions}>
          {step.rules.map((rule, index) => (
            <Branch key={index} id={`rule-${index}`} label={describeCheck(rule.when)} />
          ))}
          <Branch id="otherwise" label="Si no" muted />
        </ul>
      )}
    </div>
  );
}

/** Memoized so dragging one step doesn't re-render every other step. */
export const StepNode = memo(StepNodeView);
