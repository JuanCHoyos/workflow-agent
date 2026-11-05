import { expect, it } from "vitest";
import { createBusinessWithMainFlow, createTestEnvironment, singleMessageFlow } from "./environment.ts";

it("a Business never sees another Business's Conversations, even with the same Contact", async () => {
  const { core } = createTestEnvironment();
  const pizzeria = await createBusinessWithMainFlow(core, singleMessageFlow("Hola desde la pizzería"));
  const barbershop = await createBusinessWithMainFlow(core, singleMessageFlow("Hola desde la barbería"));
  const contact = { phone: "+573009998877" };

  await pizzeria.business.receiveInboundMessage({ contact, text: "quiero una pizza" });
  await barbershop.business.receiveInboundMessage({ contact, text: "quiero un corte" });

  const [barbershopConversation] = await barbershop.business.listConversations();
  expect(barbershopConversation?.messages.map((m) => m.text)).toEqual([
    "quiero un corte",
    "Hola desde la barbería",
  ]);
});

it("a Business with no messages sees no Conversations from other Businesses", async () => {
  const { core } = createTestEnvironment();
  const withMessages = await createBusinessWithMainFlow(core, singleMessageFlow("Hola"));
  const withoutMessages = await createBusinessWithMainFlow(core, singleMessageFlow("Hola"));

  await withMessages.business.receiveInboundMessage({ contact: { phone: "+573001234567" }, text: "hola" });

  expect(await withoutMessages.business.listConversations()).toEqual([]);
});

it("a Business cannot use another Business's Flow as its main Flow", async () => {
  const { core } = createTestEnvironment();
  const pizzeria = await createBusinessWithMainFlow(core, singleMessageFlow("Hola desde la pizzería"));
  const { id: otherId } = await core.createBusiness({ name: "Barbería" });

  await expect(core.business(otherId).setMainFlow(pizzeria.flowId)).rejects.toThrow("does not exist");
});

it("rejects messages for a Business that does not exist without sending anything", async () => {
  const { core, channel } = createTestEnvironment();

  await expect(
    core.business("missing").receiveInboundMessage({ contact: { phone: "+573001234567" }, text: "hola" }),
  ).rejects.toThrow("does not exist");
  expect(channel.sent).toEqual([]);
});
