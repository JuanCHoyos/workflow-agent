/** A linear undo history over immutable snapshots. */
export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** The key and time of the last change, to merge quick changes of the same kind. */
  last?: { key: string; at: number };
};

const LIMIT = 100;
const MERGE_WINDOW_MS = 1000;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/**
 * Records a new present. Changes with the same `key` within a second (each
 * keystroke in one field) merge into a single undo step.
 */
export function record<T>(history: History<T>, next: T, options: { key?: string; at: number }): History<T> {
  const { key, at } = options;
  const merge = key !== undefined && history.last?.key === key && at - history.last.at < MERGE_WINDOW_MS;
  if (merge) return { ...history, present: next, future: [], last: { key, at } };
  return {
    past: [...history.past, history.present].slice(-LIMIT),
    present: next,
    future: [],
    last: key === undefined ? undefined : { key, at },
  };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { past: [...history.past, history.present], present: next, future: rest };
}

export const canUndo = (history: History<unknown>) => history.past.length > 0;
export const canRedo = (history: History<unknown>) => history.future.length > 0;
