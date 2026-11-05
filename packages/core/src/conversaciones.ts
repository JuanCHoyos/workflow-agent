import { Entity } from "dynamodb-toolbox/entity";
import { boolean } from "dynamodb-toolbox/schema/boolean";
import { item } from "dynamodb-toolbox/schema/item";
import { string } from "dynamodb-toolbox/schema/string";
import type { Tablas } from "./tablas.ts";

const negocioPk = (negocioId: string) => `NEGOCIO#${negocioId}`;
export const prefijoConversacion = (telefono: string) => `CONVERSACION#${telefono}`;

export function entidadesDeConversacion(tablas: Tablas) {
  const Conversacion = new Entity({
    name: "Conversacion",
    table: tablas.conversaciones,
    schema: item({
      negocioId: string().key(),
      telefono: string().key(),
      sesionAbierta: boolean(),
    }),
    computeKey: ({ negocioId, telefono }) => ({
      pk: negocioPk(negocioId),
      sk: prefijoConversacion(telefono),
    }),
  });

  const Mensaje = new Entity({
    name: "Mensaje",
    table: tablas.conversaciones,
    schema: item({
      negocioId: string().key(),
      telefono: string().key(),
      orden: string().key(),
      autor: string().enum("contacto", "bot"),
      texto: string(),
      enviadoEn: string(),
    }),
    computeKey: ({ negocioId, telefono, orden }) => ({
      pk: negocioPk(negocioId),
      sk: `${prefijoConversacion(telefono)}#MENSAJE#${orden}`,
    }),
  });

  return { Conversacion, Mensaje, negocioPk };
}
