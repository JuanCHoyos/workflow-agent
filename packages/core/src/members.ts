import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { businessPk } from "./keys.ts";
import type { Tables } from "./tables.ts";

export type MemberRole = "owner" | "admin" | "support";

export class NotAMemberError extends Error {}

const userPk = (userId: string) => `USER#${userId}`;
export const MEMBERSHIP_PREFIX = "BUSINESS#";

export function memberEntities(tables: Tables) {
  /** A Member as seen from inside the Business. */
  const Member = new Entity({
    name: "Member",
    table: tables.businesses,
    schema: item({
      businessId: string().key(),
      userId: string().key(),
      email: string(),
      role: string().enum("owner", "admin", "support"),
    }),
    computeKey: ({ businessId, userId }) => ({ pk: businessPk(businessId), sk: `MEMBER#${userId}` }),
  });

  /** The same membership indexed by user, to list the Businesses a user belongs to. */
  const Membership = new Entity({
    name: "Membership",
    table: tables.businesses,
    schema: item({
      userId: string().key(),
      businessId: string().key(),
      businessName: string(),
      role: string().enum("owner", "admin", "support"),
    }),
    computeKey: ({ userId, businessId }) => ({
      pk: userPk(userId),
      sk: `${MEMBERSHIP_PREFIX}${businessId}`,
    }),
  });

  return { Member, Membership, userPk };
}
