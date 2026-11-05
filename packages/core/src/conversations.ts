import { Entity } from "dynamodb-toolbox/entity";
import { boolean } from "dynamodb-toolbox/schema/boolean";
import { item } from "dynamodb-toolbox/schema/item";
import { number } from "dynamodb-toolbox/schema/number";
import { string } from "dynamodb-toolbox/schema/string";
import { businessPk } from "./keys.ts";
import type { Tables } from "./tables.ts";

export const CONVERSATION_PREFIX = "CONVERSATION#";
const conversationSk = (phone: string) => `${CONVERSATION_PREFIX}${phone}`;

export function conversationEntities(tables: Tables) {
  const Conversation = new Entity({
    name: "Conversation",
    table: tables.conversations,
    schema: item({
      businessId: string().key(),
      phone: string().key(),
      sessionOpen: boolean(),
      /** The Flow version an open Session is pinned to, and where it is waiting. */
      sessionFlowId: string().optional(),
      sessionFlowVersion: number().optional(),
      sessionStepId: string().optional(),
    }),
    computeKey: ({ businessId, phone }) => ({
      pk: businessPk(businessId),
      sk: conversationSk(phone),
    }),
  });

  const Message = new Entity({
    name: "Message",
    table: tables.conversations,
    schema: item({
      businessId: string().key(),
      phone: string().key(),
      sequence: string().key(),
      author: string().enum("contact", "bot"),
      text: string(),
      sentAt: string(),
    }),
    computeKey: ({ businessId, phone, sequence }) => ({
      pk: businessPk(businessId),
      sk: `${conversationSk(phone)}#MESSAGE#${sequence}`,
    }),
  });

  return { Conversation, Message };
}
