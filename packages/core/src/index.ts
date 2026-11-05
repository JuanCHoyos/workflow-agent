export {
  createCore,
  type Contact,
  type ConversationMessage,
  type ConversationSummary,
  type Core,
  type Dependencies,
  type InboundMessage,
  type MessageAuthor,
} from "./core.ts";
export type { Channel, Clock, OutboundMessage } from "./ports.ts";
export { createTables, type TableNames } from "./tables.ts";
