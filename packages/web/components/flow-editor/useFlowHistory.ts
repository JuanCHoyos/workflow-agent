"use client";

import type { FlowDefinition } from "@workflow-agent/core/flow-definition";
import { useCallback, useState } from "react";
import { canRedo, canUndo, createHistory, record, redo, undo } from "./history.ts";

/**
 * The draft with undo and redo. Every change goes through `edit`; pass a
 * `mergeKey` for changes that should collapse into one undo step while they
 * keep coming (typing in one field).
 */
export function useFlowHistory(initial: FlowDefinition) {
  const [history, setHistory] = useState(() => createHistory(initial));

  const edit = useCallback((change: (current: FlowDefinition) => FlowDefinition, mergeKey?: string) => {
    setHistory((current) => {
      const next = change(current.present);
      return next === current.present ? current : record(current, next, { key: mergeKey, at: Date.now() });
    });
  }, []);

  return {
    draft: history.present,
    edit,
    undo: useCallback(() => setHistory(undo), []),
    redo: useCallback(() => setHistory(redo), []),
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  };
}
