/** A message the platform sends to a Contact through their channel. */
export type OutboundMessage = {
  businessId: string;
  phone: string;
  text: string;
};

/** Messaging channel (WhatsApp in the MVP). */
export interface Channel {
  send(message: OutboundMessage): Promise<void>;
}

/** Source of the current time, replaceable in tests. */
export interface Clock {
  now(): Date;
}
