/** A message the platform sends to a Contact through their channel. */
export type OutboundMessage = {
  businessId: string;
  phone: string;
  text: string;
  /** Present when the message offers choices (an OptionsMenu). */
  options?: OutboundOptions;
};

/** WhatsApp shows up to 3 options as buttons and up to 10 as a list. */
export type OutboundOptions = {
  style: "buttons" | "list";
  items: { id: string; label: string }[];
};

/** Messaging channel (WhatsApp in the MVP). */
export interface Channel {
  send(message: OutboundMessage): Promise<void>;
}

/** Source of the current time, replaceable in tests. */
export interface Clock {
  now(): Date;
}
