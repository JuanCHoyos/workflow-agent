import { expect, it } from "vitest";
import { findFlowIssues, type FlowDefinition } from "../src/index.ts";
import { createBusinessWithMainFlow, createTestEnvironment, singleMessageFlow } from "./environment.ts";

it("lists the Business's Flows with their status", async () => {
  const { core } = createTestEnvironment();
  const { business, flowId: mainId } = await createBusinessWithMainFlow(core, singleMessageFlow("Hola"));
  const { id: draftOnlyId } = await business.createFlow({ name: "Fuera de horario" });

  const flows = await business.listFlows();

  expect(flows).toEqual(
    expect.arrayContaining([
      { id: mainId, name: "Principal", publishedVersion: 1, isMain: true, hasDraft: true },
      { id: draftOnlyId, name: "Fuera de horario", publishedVersion: null, isMain: false, hasDraft: false },
    ]),
  );
  expect(flows).toHaveLength(2);
});

it("returns a Flow's draft for the editor", async () => {
  const { core } = createTestEnvironment();
  const draft = singleMessageFlow("Hola, ¿en qué te ayudo?");
  const { business, flowId } = await createBusinessWithMainFlow(core, draft);

  expect(await business.getFlowForEditing(flowId)).toEqual({
    id: flowId,
    name: "Principal",
    draft,
    publishedVersion: 1,
    isMain: true,
  });
});

it("renames a Flow", async () => {
  const { core } = createTestEnvironment();
  const { business, flowId } = await createBusinessWithMainFlow(core, singleMessageFlow("Hola"));

  await business.renameFlow(flowId, "Bienvenida");

  expect((await business.getFlowForEditing(flowId)).name).toBe("Bienvenida");
});

it("deletes a Flow that is not the main Flow", async () => {
  const { core } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, singleMessageFlow("Hola"));
  const { id } = await business.createFlow({ name: "Borrador viejo" });

  await business.deleteFlow(id);

  expect((await business.listFlows()).map((flow) => flow.name)).toEqual(["Principal"]);
});

it("refuses to delete the main Flow", async () => {
  const { core } = createTestEnvironment();
  const { business, flowId } = await createBusinessWithMainFlow(core, singleMessageFlow("Hola"));

  await expect(business.deleteFlow(flowId)).rejects.toThrow("main Flow");
});

it("lists every problem of a draft so the editor can show them before publishing", () => {
  const draft: FlowDefinition = {
    startStepId: "welcome",
    steps: {
      welcome: { type: "message", text: "Hola", next: "" },
      empty: { type: "optionsMenu", text: "¿Qué quieres?", options: [] },
      big: {
        type: "optionsMenu",
        text: "Elige",
        options: Array.from({ length: 11 }, (_, i) => ({ label: `Opción ${i + 1}`, next: "welcome" })),
      },
      branch: { type: "optionsMenu", text: "¿Seguimos?", options: [{ label: "Sí", next: "" }] },
    },
  };

  expect(findFlowIssues(draft)).toEqual([
    { code: "unconnected", stepId: "welcome" },
    { code: "noOptions", stepId: "empty" },
    { code: "tooManyOptions", stepId: "big", count: 11 },
    { code: "unconnected", stepId: "branch", optionIndex: 0 },
  ]);
});

it("finds no problems in a complete draft", () => {
  expect(findFlowIssues(singleMessageFlow("Hola"))).toEqual([]);
});

it("reports Questions without a variable and unconnected Condition branches", () => {
  const draft: FlowDefinition = {
    startStepId: "ask",
    steps: {
      ask: { type: "question", text: "¿Tu nombre?", variable: "", next: "route" },
      route: {
        type: "condition",
        rules: [{ when: { kind: "withinBusinessHours" }, next: "" }],
        otherwise: "",
      },
    },
  };

  expect(findFlowIssues(draft)).toEqual([
    { code: "missingVariable", stepId: "ask" },
    { code: "unconnected", stepId: "route", ruleIndex: 0 },
    { code: "unconnected", stepId: "route", otherwise: true },
  ]);
});
