import { expect, it } from "vitest";
import { createTestEnvironment } from "./environment.ts";

it("a Business never sees another Business's Conversations, even with the same Contact", async () => {
  const { core } = createTestEnvironment();
  const pizzeria = await core.createBusiness({ name: "Pizzería", welcomeMessage: "Hola desde la pizzería" });
  const barbershop = await core.createBusiness({ name: "Barbería", welcomeMessage: "Hola desde la barbería" });
  const contact = { phone: "+573009998877" };

  await core.business(pizzeria.id).receiveInboundMessage({ contact, text: "quiero una pizza" });
  await core.business(barbershop.id).receiveInboundMessage({ contact, text: "quiero un corte" });

  const [barbershopConversation] = await core.business(barbershop.id).listConversations();
  expect(barbershopConversation?.messages.map((m) => m.text)).toEqual([
    "quiero un corte",
    "Hola desde la barbería",
  ]);
});

it("a Business with no messages sees no Conversations from other Businesses", async () => {
  const { core } = createTestEnvironment();
  const withMessages = await core.createBusiness({ name: "Tienda", welcomeMessage: "Hola" });
  const withoutMessages = await core.createBusiness({ name: "Papelería", welcomeMessage: "Hola" });

  await core
    .business(withMessages.id)
    .receiveInboundMessage({ contact: { phone: "+573001234567" }, text: "hola" });

  expect(await core.business(withoutMessages.id).listConversations()).toEqual([]);
});

it("rejects messages for a Business that does not exist without sending anything", async () => {
  const { core, channel } = createTestEnvironment();

  await expect(
    core.business("missing").receiveInboundMessage({ contact: { phone: "+573001234567" }, text: "hola" }),
  ).rejects.toThrow("does not exist");
  expect(channel.sent).toEqual([]);
});
