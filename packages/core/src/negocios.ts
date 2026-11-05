import { Entity } from "dynamodb-toolbox/entity";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import type { Tablas } from "./tablas.ts";

export function entidadNegocio(tablas: Tablas) {
  return new Entity({
    name: "Negocio",
    table: tablas.negocios,
    schema: item({
      id: string().key(),
      nombre: string(),
      mensajeDeBienvenida: string(),
    }),
    computeKey: ({ id }) => ({ pk: `NEGOCIO#${id}`, sk: "NEGOCIO" }),
  });
}
