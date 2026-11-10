"use client";

import type { FlowStep } from "@workflow-agent/core/flow-definition";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Diamond, HelpCircle, ListChecks, MessageSquare, Square, type LucideIcon } from "lucide-react";
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

function StepNodeView({ data, selected }: NodeProps<StepNodeType>) {
  const { step, isStart, hasIssue, isActive } = data;
  const Icon = ICONS[step.type];
  const classes = [styles.node, styles[`node_${step.type}`], selected && styles.nodeSelected, hasIssue && styles.nodeIssue, isActive && styles.nodeActive]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
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
