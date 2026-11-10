import { expect, it } from "vitest";
import type { BusinessHours, FlowDefinition } from "../src/index.ts";
import { createBusinessWithMainFlow, createTestEnvironment } from "./environment.ts";

const CONTACT = { phone: "+573001112233" };

// The test clock starts on Thursday 2026-11-05 at 15:00 UTC (10:00 in Bogotá).
const WEEKDAYS_8_TO_6: BusinessHours = {
  monday: [{ open: "08:00", close: "18:00" }],
  tuesday: [{ open: "08:00", close: "18:00" }],
  wednesday: [{ open: "08:00", close: "18:00" }],
  thursday: [{ open: "08:00", close: "18:00" }],
  friday: [{ open: "08:00", close: "18:00" }],
  saturday: [],
  sunday: [],
};

it("stores the answer to a Question and inserts it into later Messages", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, {
    startStepId: "ask",
    steps: {
      ask: { type: "question", text: "¿Cómo te llamas?", variable: "nombre", next: "thanks" },
      thanks: { type: "message", text: "¡Gracias, {{nombre}}! Ya te atendemos.", next: "end" },
      end: { type: "end" },
    },
  });

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  expect(channel.sent.at(-1)?.text).toBe("¿Cómo te llamas?");

  await business.receiveInboundMessage({ contact: CONTACT, text: "Ana" });
  expect(channel.sent.at(-1)?.text).toBe("¡Gracias, Ana! Ya te atendemos.");
});

const CITY_FLOW: FlowDefinition = {
  startStepId: "ask",
  steps: {
    ask: { type: "question", text: "¿En qué ciudad estás?", variable: "ciudad", next: "route" },
    route: {
      type: "condition",
      rules: [{ when: { kind: "variableEquals", variable: "ciudad", value: "Medellín" }, next: "local" }],
      otherwise: "national",
    },
    local: { type: "message", text: "Te llevamos el pedido hoy mismo.", next: "end" },
    national: { type: "message", text: "Enviamos a {{ciudad}} en 2 días.", next: "end" },
    end: { type: "end" },
  },
};

it("branches on a variable, ignoring case and accents", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, CITY_FLOW);

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  await business.receiveInboundMessage({ contact: CONTACT, text: "medellin" });

  expect(channel.sent.at(-1)?.text).toBe("Te llevamos el pedido hoy mismo.");
});

it("takes the otherwise branch when no rule matches", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, CITY_FLOW);

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  await business.receiveInboundMessage({ contact: CONTACT, text: "Cali" });

  expect(channel.sent.at(-1)?.text).toBe("Enviamos a Cali en 2 días.");
});

const SCHEDULE_FLOW: FlowDefinition = {
  startStepId: "check",
  steps: {
    check: {
      type: "condition",
      rules: [
        { when: { kind: "weekday", days: ["saturday", "sunday"] }, next: "weekend" },
        { when: { kind: "withinBusinessHours" }, next: "open" },
      ],
      otherwise: "closed",
    },
    weekend: { type: "message", text: "Los fines de semana abrimos solo para domicilios.", next: "end" },
    open: { type: "message", text: "¡Estamos atendiendo!", next: "end" },
    closed: { type: "message", text: "Ya cerramos. Abrimos a las 8 a. m.", next: "end" },
    end: { type: "end" },
  },
};

it("knows it is inside business hours on a weekday morning in Bogotá", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, SCHEDULE_FLOW);
  await business.setBusinessHours(WEEKDAYS_8_TO_6);

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });

  expect(channel.sent.at(-1)?.text).toBe("¡Estamos atendiendo!");
});

it("knows it is outside business hours in the evening in Bogotá", async () => {
  const { core, channel, clock } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, SCHEDULE_FLOW);
  await business.setBusinessHours(WEEKDAYS_8_TO_6);
  clock.set("2026-11-05T23:30:00Z"); // 18:30 in Bogotá

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });

  expect(channel.sent.at(-1)?.text).toBe("Ya cerramos. Abrimos a las 8 a. m.");
});

it("branches on the weekday in Bogotá", async () => {
  const { core, channel, clock } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, SCHEDULE_FLOW);
  await business.setBusinessHours(WEEKDAYS_8_TO_6);
  clock.set("2026-11-08T02:00:00Z"); // Saturday 21:00 in Bogotá, Sunday in UTC

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });

  expect(channel.sent.at(-1)?.text).toBe("Los fines de semana abrimos solo para domicilios.");
});

it("returns the business hours it saved", async () => {
  const { core } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, SCHEDULE_FLOW);

  await business.setBusinessHours(WEEKDAYS_8_TO_6);

  expect(await business.getBusinessHours()).toEqual(WEEKDAYS_8_TO_6);
});

it("carries Question answers through a simulation", async () => {
  const { core } = createTestEnvironment();
  const { business, flowId } = await createBusinessWithMainFlow(core, CITY_FLOW);

  const first = await business.simulateFlowDraft(flowId, { state: null, text: "hola" });
  const second = await business.simulateFlowDraft(flowId, { state: first.state, text: "Bogotá" });

  expect(second.replies).toEqual([{ text: "Enviamos a Bogotá en 2 días." }]);
});
