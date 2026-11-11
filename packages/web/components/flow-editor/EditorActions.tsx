"use client";

import { createContext, useContext } from "react";

/** Actions step nodes and edges can trigger, provided by the editor. */
export type EditorActions = {
  openStep: (stepId: string) => void;
  duplicateSteps: (stepIds: string[]) => void;
  removeSteps: (stepIds: string[]) => void;
  disconnect: (sourceId: string, handle: string) => void;
  /** How many steps are selected; node toolbars only show for a single selection. */
  selectionSize: number;
};

export const EditorActionsContext = createContext<EditorActions | null>(null);

export function useEditorActions() {
  const actions = useContext(EditorActionsContext);
  if (!actions) throw new Error("useEditorActions must be used inside the flow editor");
  return actions;
}
