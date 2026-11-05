import { expect, it } from "vitest";
import { createTestEnvironment } from "./environment.ts";

const CONTACT = { phone: "+573001112233" };

it("replies to the Contact with the Business's fixed Flow message", async () => {
  const { core, channel } = createTestEnvironment();
  const business = await core.createBusiness({
    name: "Pizzería Don Tito",
    welcomeMessage: "¡Hola! Bienvenido a Pizzería Don Tito 🍕",
  });

  await core.business(business.id).receiveInboundMessage({ contact: CONTACT, text: "hola" });

  expect(channel.sent).toEqual([
    {
      businessId: business.id,
      phone: "+573001112233",
      text: "¡Hola! Bienvenido a Pizzería Don Tito 🍕",
    },
  ]);
});

it("records the Conversation with an open Session and the exchanged messages", async () => {
  const { core } = createTestEnvironment();
  const { id } = await core.createBusiness({
    name: "Panadería La Espiga",
    welcomeMessage: "Hola, ¿qué pan te provoca hoy?",
  });
  const business = core.business(id);

  await business.receiveInboundMessage({ contact: CONTACT, text: "buenas" });

  expect(await business.listConversations()).toEqual([
    {
      contact: { phone: "+573001112233" },
      sessionOpen: true,
      messages: [
        { author: "contact", text: "buenas", sentAt: "2026-11-05T15:00:00.000Z" },
        { author: "bot", text: "Hola, ¿qué pan te provoca hoy?", sentAt: "2026-11-05T15:00:00.000Z" },
      ],
    },
  ]);
});
