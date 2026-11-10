import { Entity } from "dynamodb-toolbox/entity";
import { any } from "dynamodb-toolbox/schema/any";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import { businessPk } from "./keys.ts";
import type { Tables } from "./tables.ts";

export function businessEntity(tables: Tables) {
  return new Entity({
    name: "Business",
    table: tables.businesses,
    schema: item({
      id: string().key(),
      name: string(),
      mainFlowId: string().optional(),
      businessHours: any().optional(),
      timeZone: string().optional(),
    }),
    computeKey: ({ id }) => ({ pk: businessPk(id), sk: "BUSINESS" }),
  });
}
