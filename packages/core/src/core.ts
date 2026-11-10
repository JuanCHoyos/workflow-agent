import { randomUUID } from "node:crypto";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteItemCommand } from "dynamodb-toolbox/entity/actions/delete";
import { GetItemCommand } from "dynamodb-toolbox/entity/actions/get";
import { PutItemCommand } from "dynamodb-toolbox/entity/actions/put";
import { $set, UpdateItemCommand } from "dynamodb-toolbox/entity/actions/update";
import { QueryCommand } from "dynamodb-toolbox/table/actions/query";
import { businessEntity } from "./businesses.ts";
import { CONVERSATION_PREFIX, conversationEntities } from "./conversations.ts";
import {
  DEFAULT_TIME_ZONE,
  continueFrom,
  runSteps,
  type ContactInput,
  type Reply,
  type RunContext,
  type RunResult,
  type Variables,
} from "./engine.ts";
import { validateFlow, type BusinessHours, type FlowDefinition } from "./flow-definition.ts";
import { FLOW_PREFIX, flowEntities, flowSk } from "./flows.ts";
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

/** Where a simulated Session waits; null before it starts or after it ends. */
export type SimulationState = { stepId: string; variables: Variables } | null;

export type FlowSummary = {
  id: string;
  name: string;
  publishedVersion: number | null;
  isMain: boolean;
  hasDraft: boolean;
};

export type SimulationTurn = { replies: Reply[]; state: SimulationState; ended: boolean };

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
       * Sends the replies of a run and records where the Session waits. A
       * waiting Session stays pinned to the Flow version it is running.
       */
      async function applyRun(phone: string, flow: PublishedFlow, run: RunResult) {
        for (const reply of run.replies) await send(phone, reply.text, reply.options);
        await Conversation.build(PutItemCommand)
          .item(
            run.waitingAt
              ? {
                  businessId,
                  phone,
                  sessionOpen: true,
                  sessionFlowId: flow.flowId,
                  sessionFlowVersion: flow.version,
                  sessionStepId: run.waitingAt,
                  sessionVariables: run.variables,
                }
              : { businessId, phone, sessionOpen: false },
          )
          .send();
      }

      async function getBusiness() {
        const { Item } = await Business.build(GetItemCommand).key({ id: businessId }).send();
        if (!Item) throw new Error(`Business ${businessId} does not exist`);
        return Item;
      }

      /** What a run needs besides the Flow: the Session variables, the time and the business hours. */
      function contextFor(
        business: { timeZone?: string; businessHours?: unknown },
        variables: Variables = {},
      ): RunContext {
        return {
          variables,
          now: clock.now(),
          timeZone: business.timeZone ?? DEFAULT_TIME_ZONE,
          businessHours: business.businessHours as BusinessHours | undefined,
        };
      }

      return {
        async listFlows(): Promise<FlowSummary[]> {
          const [{ Items = [] }, { Item: business }] = await Promise.all([
            tables.businesses
              .build(QueryCommand)
              .entities(Flow)
              .query({ partition: businessPk(businessId), range: { beginsWith: FLOW_PREFIX } })
              .send(),
            Business.build(GetItemCommand).key({ id: businessId }).send(),
          ]);
          return Items.map((flow) => ({
            id: flow.flowId,
            name: flow.name,
            publishedVersion: flow.publishedVersion ?? null,
            isMain: business?.mainFlowId === flow.flowId,
            hasDraft: flow.draft !== undefined,
          }));
        },

        async getFlowForEditing(flowId: string) {
          const [flow, { Item: business }] = await Promise.all([
            getFlow(flowId),
            Business.build(GetItemCommand).key({ id: businessId }).send(),
          ]);
          return {
            id: flow.flowId,
            name: flow.name,
            draft: (flow.draft as FlowDefinition | undefined) ?? null,
            publishedVersion: flow.publishedVersion ?? null,
            isMain: business?.mainFlowId === flow.flowId,
          };
        },

        async renameFlow(flowId: string, name: string) {
          await getFlow(flowId);
          await Flow.build(UpdateItemCommand).item({ businessId, flowId, name }).send();
        },

        /** Deletes a Flow and its published versions. The main Flow cannot be deleted. */
        async deleteFlow(flowId: string) {
          const { Item: business } = await Business.build(GetItemCommand).key({ id: businessId }).send();
          if (business?.mainFlowId === flowId) {
            throw new Error(`Flow ${flowId} is the main Flow; choose another main Flow first`);
          }
          const { Items: versions = [] } = await tables.businesses
            .build(QueryCommand)
            .entities(FlowVersion)
            .query({ partition: businessPk(businessId), range: { beginsWith: `${flowSk(flowId)}#` } })
            .send();
          for (const { version } of versions) {
            await FlowVersion.build(DeleteItemCommand).key({ businessId, flowId, version }).send();
          }
          await Flow.build(DeleteItemCommand).key({ businessId, flowId }).send();
        },

        async createFlow(data: { name: string }) {
          const flowId = randomUUID();
          await Flow.build(PutItemCommand).item({ businessId, flowId, ...data }).send();
          return { id: flowId };
        },

        /**
         * Runs one turn of the draft as if a Contact had written, without
         * sending messages or storing anything. The caller keeps the state.
         */
        async simulateFlowDraft(
          flowId: string,
          input: ContactInput & { state: SimulationState },
        ): Promise<SimulationTurn> {
          const [flow, business] = await Promise.all([getFlow(flowId), getBusiness()]);
          const draft = flow.draft as FlowDefinition | undefined;
          if (!draft) throw new Error(`Flow ${flowId} has no draft to simulate`);
          validateFlow(draft);
          const context = contextFor(business, input.state?.variables);
          const run = input.state
            ? continueFrom(draft, input.state.stepId, input, context)
            : runSteps(draft, draft.startStepId, context);
          return {
            replies: run.replies,
            state: run.waitingAt ? { stepId: run.waitingAt, variables: run.variables } : null,
            ended: run.waitingAt === null,
          };
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

        async setBusinessHours(businessHours: BusinessHours) {
          await getBusiness();
          await Business.build(UpdateItemCommand)
            .item({ id: businessId, businessHours: $set(businessHours) })
            .send();
        },

        async getBusinessHours(): Promise<BusinessHours | null> {
          const business = await getBusiness();
          return (business.businessHours as BusinessHours | undefined) ?? null;
        },

        async receiveInboundMessage(message: InboundMessage) {
          const { phone } = message.contact;
          const business = await getBusiness();

          const { Item: conversation } = await Conversation.build(GetItemCommand)
            .key({ businessId, phone })
            .send();
          await recordMessage(phone, "contact", message.text);

          const { sessionFlowId, sessionFlowVersion, sessionStepId } = conversation ?? {};
          if (conversation?.sessionOpen && sessionFlowId && sessionFlowVersion && sessionStepId) {
            const flow = await getPublishedFlow(sessionFlowId, sessionFlowVersion);
            const context = contextFor(business, conversation.sessionVariables as Variables | undefined);
            await applyRun(phone, flow, continueFrom(flow.definition, sessionStepId, message, context));
            return;
          }

          await Conversation.build(PutItemCommand).item({ businessId, phone, sessionOpen: true }).send();
          if (!business.mainFlowId) return;
          const mainFlow = await getFlow(business.mainFlowId);
          if (!mainFlow.publishedVersion) return;
          const flow = await getPublishedFlow(mainFlow.flowId, mainFlow.publishedVersion);
          await applyRun(phone, flow, runSteps(flow.definition, flow.definition.startStepId, contextFor(business)));
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
