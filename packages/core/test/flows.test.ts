import { expect, it } from "vitest";
import type { FlowDefinition } from "../src/index.ts";
import { createBusinessWithMainFlow, createTestEnvironment, singleMessageFlow } from "./environment.ts";

const CONTACT = { phone: "+573001112233" };

it("sends the Message steps of the published main Flow in order", async () => {
  const { core, channel } = createTestEnvironment();
  const { businessId, business } = await createBusinessWithMainFlow(core, {
    startStepId: "welcome",
    steps: {
      welcome: { type: "message", text: "¡Hola! Bienvenido a Pizzería Don Tito 🍕", next: "hours" },
      hours: { type: "message", text: "Abrimos todos los días de 11 a. m. a 10 p. m.", next: "end" },
      end: { type: "end" },
    },
  });

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });

  expect(channel.sent).toEqual([
    { businessId, phone: CONTACT.phone, text: "¡Hola! Bienvenido a Pizzería Don Tito 🍕" },
    { businessId, phone: CONTACT.phone, text: "Abrimos todos los días de 11 a. m. a 10 p. m." },
  ]);
});

const ORDER_MENU_FLOW = {
  startStepId: "welcome",
  steps: {
    welcome: { type: "message", text: "¡Hola! Soy el asistente de Pizzería Don Tito", next: "menu" },
    menu: {
      type: "optionsMenu",
      text: "¿Qué quieres hacer?",
      options: [
        { label: "Ver carta", next: "catalog" },
        { label: "Pedir", next: "order" },
        { label: "Reservar", next: "booking" },
      ],
    },
    catalog: { type: "message", text: "Esta es nuestra carta", next: "end" },
    order: { type: "message", text: "¡Perfecto! Vamos con tu pedido", next: "end" },
    booking: { type: "message", text: "¿Para cuántas personas?", next: "end" },
    end: { type: "end" },
  },
} as const satisfies FlowDefinition;

it("shows an OptionsMenu with up to 3 options as buttons and follows the chosen branch", async () => {
  const { core, channel } = createTestEnvironment();
  const { businessId, business } = await createBusinessWithMainFlow(core, ORDER_MENU_FLOW);

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });

  const menu = channel.sent.at(-1);
  expect(menu).toEqual({
    businessId,
    phone: CONTACT.phone,
    text: "¿Qué quieres hacer?",
    options: {
      style: "buttons",
      items: [
        { id: expect.any(String), label: "Ver carta" },
        { id: expect.any(String), label: "Pedir" },
        { id: expect.any(String), label: "Reservar" },
      ],
    },
  });

  const order = menu?.options?.items[1];
  await business.receiveInboundMessage({ contact: CONTACT, text: "Pedir", selectedOptionId: order?.id });

  expect(channel.sent.at(-1)?.text).toBe("¡Perfecto! Vamos con tu pedido");
});

const menuWith = (count: number): FlowDefinition => ({
  startStepId: "menu",
  steps: {
    menu: {
      type: "optionsMenu",
      text: "Elige una categoría",
      options: Array.from({ length: count }, (_, i) => ({ label: `Categoría ${i + 1}`, next: "end" })),
    },
    end: { type: "end" },
  },
});

it("shows an OptionsMenu with 4 to 10 options as a list", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, menuWith(10));

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });

  const options = channel.sent.at(-1)?.options;
  expect(options?.style).toBe("list");
  expect(options?.items.map((item) => item.label)).toEqual([
    "Categoría 1", "Categoría 2", "Categoría 3", "Categoría 4", "Categoría 5",
    "Categoría 6", "Categoría 7", "Categoría 8", "Categoría 9", "Categoría 10",
  ]);
});

it("refuses to publish an OptionsMenu with more than 10 options", async () => {
  const { core } = createTestEnvironment();
  const { id } = await core.createBusiness({ name: "Papelería" });
  const business = core.business(id);
  const { id: flowId } = await business.createFlow({ name: "Principal" });
  await business.saveFlowDraft(flowId, menuWith(11));

  await expect(business.publishFlow(flowId)).rejects.toThrow(
    'Step "menu" has 11 options; an OptionsMenu allows at most 10',
  );
});

it("refuses to publish an OptionsMenu without options", async () => {
  const { core } = createTestEnvironment();
  const { id } = await core.createBusiness({ name: "Papelería" });
  const business = core.business(id);
  const { id: flowId } = await business.createFlow({ name: "Principal" });
  await business.saveFlowDraft(flowId, menuWith(0));

  await expect(business.publishFlow(flowId)).rejects.toThrow('Step "menu" has no options');
});

it("keeps answering with the published version while the draft is being edited", async () => {
  const { core, channel } = createTestEnvironment();
  const { business, flowId } = await createBusinessWithMainFlow(core, singleMessageFlow("Horario: 8 a. m. a 6 p. m."));

  await business.saveFlowDraft(flowId, singleMessageFlow("Horario: 7 a. m. a 9 p. m."));
  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  expect(channel.sent.at(-1)?.text).toBe("Horario: 8 a. m. a 6 p. m.");

  await business.publishFlow(flowId);
  await business.receiveInboundMessage({ contact: { phone: "+573005556677" }, text: "hola" });
  expect(channel.sent.at(-1)?.text).toBe("Horario: 7 a. m. a 9 p. m.");
});

const promoFlow = (answer: string): FlowDefinition => ({
  startStepId: "menu",
  steps: {
    menu: { type: "optionsMenu", text: "¿Quieres ver la promo?", options: [{ label: "Sí", next: "promo" }] },
    promo: { type: "message", text: answer, next: "end" },
    end: { type: "end" },
  },
});

it("finishes a Session with the Flow version it started with, even after a new version is published", async () => {
  const { core, channel } = createTestEnvironment();
  const { business, flowId } = await createBusinessWithMainFlow(core, promoFlow("Promo v1: 2x1 en pizzas"));

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  const yes = channel.sent.at(-1)?.options?.items[0];

  await business.saveFlowDraft(flowId, promoFlow("Promo v2: bebida gratis"));
  await business.publishFlow(flowId);
  await business.receiveInboundMessage({ contact: CONTACT, text: "Sí", selectedOptionId: yes?.id });

  expect(channel.sent.at(-1)?.text).toBe("Promo v1: 2x1 en pizzas");
});

it("accepts an option typed as text instead of tapped, ignoring case and accents", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, ORDER_MENU_FLOW);

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  await business.receiveInboundMessage({ contact: CONTACT, text: "  RESERVAR " });

  expect(channel.sent.at(-1)?.text).toBe("¿Para cuántas personas?");
});

it("shows the OptionsMenu again when the reply matches none of its options", async () => {
  const { core, channel } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(core, ORDER_MENU_FLOW);

  await business.receiveInboundMessage({ contact: CONTACT, text: "hola" });
  const menu = channel.sent.at(-1);
  const sentBefore = channel.sent.length;
  await business.receiveInboundMessage({ contact: CONTACT, text: "¿tienen pizza hawaiana?" });

  expect(channel.sent.slice(sentBefore)).toEqual([menu]);
  const [conversation] = await business.listConversations();
  expect(conversation?.sessionOpen).toBe(true);
});

it("does not reply but keeps the message when the Business has no published main Flow", async () => {
  const { core, channel } = createTestEnvironment();
  const { id } = await core.createBusiness({ name: "Tienda Doña Rosa" });
  const business = core.business(id);
  const { id: flowId } = await business.createFlow({ name: "Principal" });
  await business.saveFlowDraft(flowId, singleMessageFlow("Hola"));
  await business.setMainFlow(flowId);

  await business.receiveInboundMessage({ contact: CONTACT, text: "¿tienen huevos?" });

  expect(channel.sent).toEqual([]);
  const [conversation] = await business.listConversations();
  expect(conversation?.messages.map((m) => [m.author, m.text])).toEqual([["contact", "¿tienen huevos?"]]);
});
