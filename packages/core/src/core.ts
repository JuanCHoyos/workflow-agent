import { randomUUID } from "node:crypto";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetItemCommand } from "dynamodb-toolbox/entity/actions/get";
import { PutItemCommand } from "dynamodb-toolbox/entity/actions/put";
import { $set, UpdateItemCommand } from "dynamodb-toolbox/entity/actions/update";
import { QueryCommand } from "dynamodb-toolbox/table/actions/query";
import { businessEntity } from "./businesses.ts";
import { CONVERSATION_PREFIX, conversationEntities } from "./conversations.ts";
import {
  MAX_BUTTON_OPTIONS,
  flowEntities,
  optionId,
  validateFlow,
  type FlowDefinition,
  type FlowStep,
  type OptionsMenuStep,
} from "./flows.ts";
import { businessPk } from "./keys.ts";
import { MEMBERSHIP_PREFIX, NotAMemberError, memberEntities } from "./members.ts";
import type { Channel, Clock, OutboundOptions } from "./ports.ts";
import { buildTables, type TableNames } from "./tables.ts";

export type Dependencies = {
  dynamodb: DynamoDBClient;
  tables: TableNames;
  channel: Channel;
  clock: Clock;
};

export type Contact = { phone: string };

export type InboundMessage = {
  contact: Contact;
  text: string;
  /** Set when the Contact tapped a button or list row of an OptionsMenu. */
  selectedOptionId?: string;
};

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

type PublishedFlow = { flowId: string; version: number; definition: FlowDefinition };

/** Lowercase, trimmed and without accents, so "  RESERVAR " matches "Reservar". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

/** Unique, increasing sequence even when two messages share the same time. */
function sequenceFor(date: Date) {
  return `${date.toISOString()}#${process.hrtime.bigint().toString().padStart(20, "0")}`;
}

export function createCore(dependencies: Dependencies) {
  const { channel, clock } = dependencies;
  const tables = buildTables(dependencies.dynamodb, dependencies.tables);
  const Business = businessEntity(tables);
  const { Conversation, Message } = conversationEntities(tables);
  const { Flow, FlowVersion } = flowEntities(tables);
  const { Member, Membership, userPk } = memberEntities(tables);

  const core = {
    /** Signs a user up: creates their Business with them as its owner. */
    async createBusinessWithOwner(data: { name: string; owner: { userId: string; email: string } }) {
      const { id } = await core.createBusiness({ name: data.name });
      const { userId, email } = data.owner;
      await Member.build(PutItemCommand).item({ businessId: id, userId, email, role: "owner" }).send();
      await Membership.build(PutItemCommand)
        .item({ userId, businessId: id, businessName: data.name, role: "owner" })
        .send();
      return { id };
    },

    /** The Businesses a user belongs to, with their role in each. */
    async businessesOf(userId: string) {
      const { Items = [] } = await tables.businesses
        .build(QueryCommand)
        .entities(Membership)
        .query({ partition: userPk(userId), range: { beginsWith: MEMBERSHIP_PREFIX } })
        .send();
      return Items.map(({ businessId, businessName, role }) => ({ businessId, name: businessName, role }));
    },

    /**
     * The entry point for the web panel: resolves the acting Member and only
     * then exposes the Business's operations.
     */
    async asMember(businessId: string, userId: string) {
      const { Item } = await Member.build(GetItemCommand).key({ businessId, userId }).send();
      if (!Item) throw new NotAMemberError(`User ${userId} is not a Member of Business ${businessId}`);
      const member = { userId: Item.userId, email: Item.email, role: Item.role };
      return { ...core.business(businessId), member };
    },

    async createBusiness(data: { name: string }) {
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

      async function send(phone: string, text: string, options?: OutboundOptions) {
        await channel.send({ businessId, phone, text, ...(options && { options }) });
        await recordMessage(phone, "bot", text);
      }

      async function getFlow(flowId: string) {
        const { Item } = await Flow.build(GetItemCommand).key({ businessId, flowId }).send();
        if (!Item) throw new Error(`Flow ${flowId} does not exist`);
        return Item;
      }

      async function getPublishedFlow(flowId: string, version: number): Promise<PublishedFlow> {
        const { Item } = await FlowVersion.build(GetItemCommand)
          .key({ businessId, flowId, version })
          .send();
        if (!Item) throw new Error(`Flow ${flowId} has no version ${version}`);
        return { flowId, version, definition: Item.definition as FlowDefinition };
      }

      /**
       * Runs steps from `stepId` until the Flow ends or waits for the Contact.
       * A waiting Session stays pinned to the Flow version it is running.
       */
      async function runFrom(phone: string, flow: PublishedFlow, stepId: string) {
        let current: string | undefined = stepId;
        while (current) {
          const step: FlowStep | undefined = flow.definition.steps[current];
          if (!step || step.type === "end") break;
          if (step.type === "optionsMenu") {
            await sendOptionsMenu(phone, current, step);
            await Conversation.build(PutItemCommand)
              .item({
                businessId,
                phone,
                sessionOpen: true,
                sessionFlowId: flow.flowId,
                sessionFlowVersion: flow.version,
                sessionStepId: current,
              })
              .send();
            return;
          }
          await send(phone, step.text);
          current = step.next;
        }
        await Conversation.build(PutItemCommand)
          .item({ businessId, phone, sessionOpen: false })
          .send();
      }

      async function sendOptionsMenu(phone: string, stepId: string, step: OptionsMenuStep) {
        await send(phone, step.text, {
          style: step.options.length <= MAX_BUTTON_OPTIONS ? "buttons" : "list",
          items: step.options.map((option, index) => ({ id: optionId(stepId, index), label: option.label })),
        });
      }

      /** The option the Contact chose: a tapped button or list row, or its label typed as text. */
      function chosenOption(stepId: string, step: OptionsMenuStep, message: InboundMessage) {
        const typed = normalize(message.text);
        return step.options.find(
          (option, index) =>
            message.selectedOptionId === optionId(stepId, index) || normalize(option.label) === typed,
        );
      }

      async function continueSession(
        phone: string,
        session: { flowId: string; version: number; stepId: string },
        message: InboundMessage,
      ) {
        const flow = await getPublishedFlow(session.flowId, session.version);
        const step = flow.definition.steps[session.stepId];
        if (step?.type !== "optionsMenu") return runFrom(phone, flow, session.stepId);
        const option = chosenOption(session.stepId, step, message);
        if (!option) return sendOptionsMenu(phone, session.stepId, step);
        await runFrom(phone, flow, option.next);
      }

      return {
        async createFlow(data: { name: string }) {
          const flowId = randomUUID();
          await Flow.build(PutItemCommand).item({ businessId, flowId, ...data }).send();
          return { id: flowId };
        },

        async saveFlowDraft(flowId: string, draft: FlowDefinition) {
          await getFlow(flowId);
          await Flow.build(UpdateItemCommand).item({ businessId, flowId, draft: $set(draft) }).send();
        },

        async publishFlow(flowId: string) {
          const flow = await getFlow(flowId);
          const draft = flow.draft as FlowDefinition | undefined;
          if (!draft) throw new Error(`Flow ${flowId} has no draft to publish`);
          validateFlow(draft);
          const version = (flow.publishedVersion ?? 0) + 1;
          await FlowVersion.build(PutItemCommand)
            .item({ businessId, flowId, version, definition: draft })
            .send();
          await Flow.build(UpdateItemCommand)
            .item({ businessId, flowId, publishedVersion: version })
            .send();
          return { version };
        },

        async setMainFlow(flowId: string) {
          await getFlow(flowId);
          await Business.build(UpdateItemCommand).item({ id: businessId, mainFlowId: flowId }).send();
        },

        async receiveInboundMessage(message: InboundMessage) {
          const { phone } = message.contact;
          const { Item: business } = await Business.build(GetItemCommand)
            .key({ id: businessId })
            .send();
          if (!business) throw new Error(`Business ${businessId} does not exist`);

          const { Item: conversation } = await Conversation.build(GetItemCommand)
            .key({ businessId, phone })
            .send();
          await recordMessage(phone, "contact", message.text);

          const { sessionFlowId, sessionFlowVersion, sessionStepId } = conversation ?? {};
          if (conversation?.sessionOpen && sessionFlowId && sessionFlowVersion && sessionStepId) {
            await continueSession(
              phone,
              { flowId: sessionFlowId, version: sessionFlowVersion, stepId: sessionStepId },
              message,
            );
            return;
          }

          await Conversation.build(PutItemCommand).item({ businessId, phone, sessionOpen: true }).send();
          if (!business.mainFlowId) return;
          const mainFlow = await getFlow(business.mainFlowId);
          if (!mainFlow.publishedVersion) return;
          const flow = await getPublishedFlow(mainFlow.flowId, mainFlow.publishedVersion);
          await runFrom(phone, flow, flow.definition.startStepId);
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

  return core;
}

export type Core = ReturnType<typeof createCore>;
