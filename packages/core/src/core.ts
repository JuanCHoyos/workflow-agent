import { randomUUID } from "node:crypto";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetItemCommand } from "dynamodb-toolbox/entity/actions/get";
import { PutItemCommand } from "dynamodb-toolbox/entity/actions/put";
import { QueryCommand } from "dynamodb-toolbox/table/actions/query";
import { businessEntity } from "./businesses.ts";
import { CONVERSATION_PREFIX, conversationEntities } from "./conversations.ts";
import { businessPk } from "./keys.ts";
import type { Channel, Clock } from "./ports.ts";
import { buildTables, type TableNames } from "./tables.ts";

export type Dependencies = {
  dynamodb: DynamoDBClient;
  tables: TableNames;
  channel: Channel;
  clock: Clock;
};

export type Contact = { phone: string };

export type InboundMessage = { contact: Contact; text: string };

export type MessageAuthor = "contact" | "bot";

export type ConversationMessage = {
  author: MessageAuthor;
  text: string;
  sentAt: string;
};

export type ConversationSummary = {
  contact: Contact;
  sessionOpen: boolean;
  messages: ConversationMessage[];
};

/** Unique, increasing sequence even when two messages share the same time. */
function sequenceFor(date: Date) {
  return `${date.toISOString()}#${process.hrtime.bigint().toString().padStart(20, "0")}`;
}

export function createCore(dependencies: Dependencies) {
  const { channel, clock } = dependencies;
  const tables = buildTables(dependencies.dynamodb, dependencies.tables);
  const Business = businessEntity(tables);
  const { Conversation, Message } = conversationEntities(tables);

  return {
    async createBusiness(data: { name: string; welcomeMessage: string }) {
      const id = randomUUID();
      await Business.build(PutItemCommand).item({ id, ...data }).send();
      return { id };
    },

    /**
     * Every operation on a Business's data goes through here: the Business id
     * is mandatory and scopes every access.
     */
    business(businessId: string) {
      async function recordMessage(phone: string, author: MessageAuthor, text: string) {
        const now = clock.now();
        await Message.build(PutItemCommand)
          .item({ businessId, phone, sequence: sequenceFor(now), author, text, sentAt: now.toISOString() })
          .send();
      }

      return {
        async receiveInboundMessage({ contact, text }: InboundMessage) {
          const { Item: business } = await Business.build(GetItemCommand)
            .key({ id: businessId })
            .send();
          if (!business) throw new Error(`Business ${businessId} does not exist`);

          await Conversation.build(PutItemCommand)
            .item({ businessId, phone: contact.phone, sessionOpen: true })
            .send();
          await recordMessage(contact.phone, "contact", text);

          await channel.send({ businessId, phone: contact.phone, text: business.welcomeMessage });
          await recordMessage(contact.phone, "bot", business.welcomeMessage);
        },

        async listConversations(): Promise<ConversationSummary[]> {
          const { Items = [] } = await tables.conversations
            .build(QueryCommand)
            .entities(Conversation, Message)
            .query({ partition: businessPk(businessId), range: { beginsWith: CONVERSATION_PREFIX } })
            .options({ showEntityAttr: true })
            .send();

          const byPhone = new Map<string, ConversationSummary>();
          for (const record of Items) {
            if (record.entity !== "Conversation") continue;
            byPhone.set(record.phone, {
              contact: { phone: record.phone },
              sessionOpen: record.sessionOpen,
              messages: [],
            });
          }
          for (const record of Items) {
            if (record.entity !== "Message") continue;
            const { author, text, sentAt } = record;
            byPhone.get(record.phone)?.messages.push({ author, text, sentAt });
          }
          return [...byPhone.values()];
        },
      };
    },
  };
}

export type Core = ReturnType<typeof createCore>;
