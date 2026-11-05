import { Entity } from "dynamodb-toolbox/entity";
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
      welcomeMessage: string(),
    }),
    computeKey: ({ id }) => ({ pk: businessPk(id), sk: "BUSINESS" }),
  });
}
