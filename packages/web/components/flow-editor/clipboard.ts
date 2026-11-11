"use client";

import type { FlowClipboard } from "./model.ts";

const STORAGE_KEY = "workflow-agent:flow-clipboard";
let memory: FlowClipboard | null = null;

/**
 * Copied steps live in memory and, when the browser allows it, in
 * localStorage, so they can be pasted into another Flow in another tab.
 */
export function writeClipboard(clipboard: FlowClipboard) {
  memory = clipboard;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clipboard));
  } catch {
    // Private mode or blocked storage: the in-memory copy still works.
  }
}

export function readClipboard(): FlowClipboard | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as FlowClipboard;
  } catch {
    // Fall back to memory.
  }
  return memory;
}
