"use client";

import type { FlowStep } from "@workflow-agent/core/flow-definition";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { STEP_LABELS } from "./model.ts";
import styles from "./editor.module.css";

export type StepNodeData = { step: FlowStep; isStart: boolean; hasIssue: boolean };
export type StepNodeType = Node<StepNodeData, "step">;

export function StepNode({ data, selected }: NodeProps<StepNodeType>) {
  const { step, isStart, hasIssue } = data;
  const classes = [styles.node, styles[`node_${step.type}`], selected && styles.nodeSelected, hasIssue && styles.nodeIssue]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.nodeHeader}>
        <span>{STEP_LABELS[step.type]}</span>
        {isStart && <span className={styles.startBadge}>Inicio</span>}
      </div>
      {step.type !== "end" && <p className={styles.nodeText}>{step.text || "Sin texto"}</p>}
      {step.type === "message" && (
        <Handle id="next" type="source" position={Position.Right} className={styles.handle} />
      )}
      {step.type === "optionsMenu" && (
        <ul className={styles.nodeOptions}>
          {step.options.map((option, index) => (
            <li key={index} className={styles.nodeOption}>
              <span>{option.label || `Opción ${index + 1}`}</span>
              <Handle
                id={`option-${index}`}
                type="source"
                position={Position.Right}
                className={styles.handle}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
