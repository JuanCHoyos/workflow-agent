import { expect, it } from "vitest";
import { createBusinessWithMainFlow, createTestEnvironment, singleMessageFlow } from "./environment.ts";

const CONTACT = { phone: "+573001112233" };

it("records the Conversation and the exchanged messages, closing the Session when the Flow ends", async () => {
  const { core } = createTestEnvironment();
  const { business } = await createBusinessWithMainFlow(
    core,
    singleMessageFlow("Hola, ¿qué pan te provoca hoy?"),
    "Panadería La Espiga",
  );

  await business.receiveInboundMessage({ contact: CONTACT, text: "buenas" });

  expect(await business.listConversations()).toEqual([
    {
      contact: { phone: "+573001112233" },
      sessionOpen: false,
      messages: [
        { author: "contact", text: "buenas", sentAt: "2026-11-05T15:00:00.000Z" },
        { author: "bot", text: "Hola, ¿qué pan te provoca hoy?", sentAt: "2026-11-05T15:00:00.000Z" },
      ],
    },
  ]);
});
