import type { FlowDefinition } from "@workflow-agent/core/flow-definition";
import { describe, expect, it } from "vitest";
import { autoLayout } from "./layout.ts";
import { alignSteps, copySteps, distributeSteps, pasteSteps, removeSteps } from "./model.ts";

const FLOW: FlowDefinition = {
  startStepId: "welcome",
  steps: {
    welcome: { type: "message", text: "Hola", next: "menu" },
    menu: {
      type: "optionsMenu",
      text: "¿Qué quieres?",
      options: [
        { label: "Pedir", next: "order" },
        { label: "Salir", next: "end" },
      ],
    },
    order: { type: "message", text: "¿Qué pizza?", next: "end" },
    end: { type: "end" },
  },
  positions: {
    welcome: { x: 0, y: 0 },
    menu: { x: 300, y: 40 },
    order: { x: 620, y: 0 },
    end: { x: 620, y: 200 },
  },
};

describe("copy and paste", () => {
  it("keeps connections between copied steps and drops the ones leaving the selection", () => {
    const clip = copySteps(FLOW, ["menu", "order"]);

    expect(clip.steps.menu).toEqual({
      type: "optionsMenu",
      text: "¿Qué quieres?",
      options: [
        { label: "Pedir", next: "order" },
        { label: "Salir", next: "" },
      ],
    });
    expect(clip.steps.order).toEqual({ type: "message", text: "¿Qué pizza?", next: "" });
  });

  it("pastes copies under fresh ids, rewired to each other and offset from the originals", () => {
    const clip = copySteps(FLOW, ["menu", "order"]);

    const { definition, pastedIds } = pasteSteps(FLOW, clip, { x: 40, y: 40 });

    expect(pastedIds).toHaveLength(2);
    const [menuCopy, orderCopy] = pastedIds;
    expect(definition.steps[menuCopy!]).toMatchObject({
      type: "optionsMenu",
      options: [{ next: orderCopy }, { next: "" }],
    });
    expect(definition.positions?.[menuCopy!]).toEqual({ x: 340, y: 80 });
    expect(Object.keys(definition.steps)).toHaveLength(6);
    expect(definition.startStepId).toBe("welcome");
  });

  it("pastes into an empty Flow and makes the first pasted step the start", () => {
    const empty: FlowDefinition = { startStepId: "", steps: {} };

    const { definition, pastedIds } = pasteSteps(empty, copySteps(FLOW, ["welcome"]), { x: 0, y: 0 });

    expect(definition.startStepId).toBe(pastedIds[0]);
  });
});

describe("removing several steps", () => {
  it("removes them and disconnects every step that pointed to them", () => {
    const result = removeSteps(FLOW, ["menu", "order"]);

    expect(Object.keys(result.steps)).toEqual(["welcome", "end"]);
    expect(result.steps.welcome).toEqual({ type: "message", text: "Hola", next: "" });
    expect(result.positions).toEqual({ welcome: { x: 0, y: 0 }, end: { x: 620, y: 200 } });
  });

  it("moves the start to a remaining step when the start is removed", () => {
    expect(removeSteps(FLOW, ["welcome"]).startStepId).toBe("menu");
  });
});

describe("aligning and distributing", () => {
  it("aligns selected steps to the leftmost one", () => {
    const result = alignSteps(FLOW, ["menu", "order", "end"], "left");

    expect(result.positions).toMatchObject({ menu: { x: 300 }, order: { x: 300 }, end: { x: 300 } });
    expect(result.positions?.welcome).toEqual({ x: 0, y: 0 });
  });

  it("aligns selected steps to the topmost one", () => {
    const result = alignSteps(FLOW, ["welcome", "menu", "end"], "top");

    expect(result.positions).toMatchObject({ welcome: { y: 0 }, menu: { y: 0 }, end: { y: 0 } });
  });

  it("spreads three or more steps evenly between the outer two", () => {
    const flow: FlowDefinition = {
      ...FLOW,
      positions: { welcome: { x: 0, y: 0 }, menu: { x: 100, y: 0 }, order: { x: 900, y: 0 }, end: { x: 0, y: 0 } },
    };

    const result = distributeSteps(flow, ["welcome", "menu", "order"], "horizontal");

    expect(result.positions).toMatchObject({ welcome: { x: 0 }, menu: { x: 450 }, order: { x: 900 } });
  });
});

describe("auto layout", () => {
  it("places each step to the right of the step that leads to it", () => {
    const sizes = { welcome: { width: 248, height: 80 }, menu: { width: 248, height: 140 } };

    const positions = autoLayout(FLOW, sizes);

    expect(positions.menu!.x).toBeGreaterThan(positions.welcome!.x);
    expect(positions.order!.x).toBeGreaterThan(positions.menu!.x);
    expect(Object.keys(positions).sort()).toEqual(["end", "menu", "order", "welcome"]);
  });
});
