import { describe, expect, it } from "vitest";
import { canRedo, canUndo, createHistory, record, redo, undo } from "./history.ts";

describe("undo history", () => {
  it("undoes and redoes recorded changes in order", () => {
    let history = createHistory("a");
    history = record(history, "b", { at: 0 });
    history = record(history, "c", { at: 5000 });

    history = undo(history);
    expect(history.present).toBe("b");
    history = undo(history);
    expect(history.present).toBe("a");
    expect(canUndo(history)).toBe(false);

    history = redo(history);
    expect(history.present).toBe("b");
    expect(canRedo(history)).toBe(true);
  });

  it("merges quick changes with the same key into one step, like typing a word", () => {
    let history = createHistory("");
    history = record(history, "H", { key: "text:welcome", at: 0 });
    history = record(history, "Ho", { key: "text:welcome", at: 200 });
    history = record(history, "Hol", { key: "text:welcome", at: 400 });

    history = undo(history);

    expect(history.present).toBe("");
  });

  it("keeps changes separate when the key changes or time passes", () => {
    let history = createHistory("");
    history = record(history, "H", { key: "text:welcome", at: 0 });
    history = record(history, "Ho", { key: "text:welcome", at: 5000 });

    history = undo(history);

    expect(history.present).toBe("H");
  });

  it("drops the redo branch when a new change is recorded after undoing", () => {
    let history = createHistory("a");
    history = record(history, "b", { at: 0 });
    history = undo(history);
    history = record(history, "c", { at: 5000 });

    expect(canRedo(history)).toBe(false);
    expect(undo(history).present).toBe("a");
  });

  it("keeps at most 100 steps", () => {
    let history = createHistory(0);
    for (let i = 1; i <= 150; i++) history = record(history, i, { at: i * 5000 });

    expect(history.past).toHaveLength(100);
  });
});
