import { expect, it } from "vitest";
import type { FlowDefinition } from "../src/index.ts";
import { createBusinessWithMainFlow, createTestEnvironment, singleMessageFlow } from "./environment.ts";

const MENU_FLOW: FlowDefinition = {
  startStepId: "welcome",
  steps: {
    welcome: { type: "message", text: "¡Hola! Soy el asistente de la panadería", next: "menu" },
    menu: {
      type: "optionsMenu",
      text: "¿Qué quieres hacer?",
      options: [
        { label: "Ver precios", next: "prices" },
        { label: "Hacer un pedido", next: "order" },
      ],
    },
    prices: { type: "message", text: "Pan francés $500 · Croissant $3.000", next: "end" },
    order: { type: "message", text: "¿Qué te gustaría pedir?", next: "end" },
    end: { type: "end" },
  },
};

async function businessWithDraft(draft: FlowDefinition) {
  const { core, channel } = createTestEnvironment();
  const { business, flowId } = await createBusinessWithMainFlow(core, singleMessageFlow("Versión publicada"));
  await business.saveFlowDraft(flowId, draft);
  return { business, flowId, channel };
}

it("simulates the draft from the start and stops at the first OptionsMenu", async () => {
  const { business, flowId } = await businessWithDraft(MENU_FLOW);

  const turn = await business.simulateFlowDraft(flowId, { state: null, text: "hola" });

  expect(turn.replies).toEqual([
    { text: "¡Hola! Soy el asistente de la panadería" },
    {
      text: "¿Qué quieres hacer?",
      options: {
        style: "buttons",
        items: [
          { id: expect.any(String), label: "Ver precios" },
          { id: expect.any(String), label: "Hacer un pedido" },
        ],
      },
    },
  ]);
  expect(turn.ended).toBe(false);
});

it("continues the simulation with the chosen option until the Flow ends", async () => {
  const { business, flowId } = await businessWithDraft(MENU_FLOW);
  const first = await business.simulateFlowDraft(flowId, { state: null, text: "hola" });
  const order = first.replies.at(-1)?.options?.items[1];

  const second = await business.simulateFlowDraft(flowId, {
    state: first.state,
    text: "Hacer un pedido",
    selectedOptionId: order?.id,
  });

  expect(second.replies).toEqual([{ text: "¿Qué te gustaría pedir?" }]);
  expect(second.ended).toBe(true);
});

it("simulates without sending messages or creating Conversations", async () => {
  const { business, flowId, channel } = await businessWithDraft(MENU_FLOW);

  await business.simulateFlowDraft(flowId, { state: null, text: "hola" });

  expect(channel.sent).toEqual([]);
  expect(await business.listConversations()).toEqual([]);
});

it("reports why a draft cannot be simulated", async () => {
  const { business, flowId } = await businessWithDraft({
    startStepId: "welcome",
    steps: { welcome: { type: "message", text: "Hola", next: "missing" } },
  });

  await expect(business.simulateFlowDraft(flowId, { state: null, text: "hola" })).rejects.toThrow(
    'Step "welcome" points to a missing step "missing"',
  );
});
