import { randomUUID } from "node:crypto";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetItemCommand } from "dynamodb-toolbox/entity/actions/get";
import { PutItemCommand } from "dynamodb-toolbox/entity/actions/put";
import { QueryCommand } from "dynamodb-toolbox/table/actions/query";
import { entidadesDeConversacion } from "./conversaciones.ts";
import { entidadNegocio } from "./negocios.ts";
import type { Canal, Reloj } from "./puertos.ts";
import { construirTablas, type NombresDeTablas } from "./tablas.ts";

export type Dependencias = {
  dynamodb: DynamoDBClient;
  tablas: NombresDeTablas;
  canal: Canal;
  reloj: Reloj;
};

export type Contacto = { telefono: string };

export type MensajeEntrante = { contacto: Contacto; texto: string };

export type MensajeDeConversacion = {
  autor: "contacto" | "bot";
  texto: string;
  enviadoEn: string;
};

export type ResumenDeConversacion = {
  contacto: Contacto;
  sesionAbierta: boolean;
  mensajes: MensajeDeConversacion[];
};

/** Orden único y creciente aunque dos mensajes compartan la misma hora. */
function ordenDe(fecha: Date) {
  return `${fecha.toISOString()}#${process.hrtime.bigint().toString().padStart(20, "0")}`;
}

export function crearCore(dependencias: Dependencias) {
  const { canal, reloj } = dependencias;
  const tablas = construirTablas(dependencias.dynamodb, dependencias.tablas);
  const Negocio = entidadNegocio(tablas);
  const { Conversacion, Mensaje, negocioPk } = entidadesDeConversacion(tablas);

  return {
    async crearNegocio(datos: { nombre: string; mensajeDeBienvenida: string }) {
      const id = randomUUID();
      await Negocio.build(PutItemCommand).item({ id, ...datos }).send();
      return { id };
    },

    /**
     * Todas las operaciones sobre los datos de un Negocio pasan por aquí:
     * el identificador del Negocio es obligatorio y acota cada acceso.
     */
    negocio(negocioId: string) {
      async function registrarMensaje(telefono: string, autor: "contacto" | "bot", texto: string) {
        const ahora = reloj.ahora();
        await Mensaje.build(PutItemCommand)
          .item({ negocioId, telefono, orden: ordenDe(ahora), autor, texto, enviadoEn: ahora.toISOString() })
          .send();
      }

      return {
        async recibirMensajeEntrante({ contacto, texto }: MensajeEntrante) {
          const { Item: negocio } = await Negocio.build(GetItemCommand)
            .key({ id: negocioId })
            .send();
          if (!negocio) throw new Error(`Negocio ${negocioId} no existe`);

          await Conversacion.build(PutItemCommand)
            .item({ negocioId, telefono: contacto.telefono, sesionAbierta: true })
            .send();
          await registrarMensaje(contacto.telefono, "contacto", texto);

          await canal.enviar({
            negocioId,
            telefono: contacto.telefono,
            texto: negocio.mensajeDeBienvenida,
          });
          await registrarMensaje(contacto.telefono, "bot", negocio.mensajeDeBienvenida);
        },

        async listarConversaciones(): Promise<ResumenDeConversacion[]> {
          const { Items = [] } = await tablas.conversaciones
            .build(QueryCommand)
            .entities(Conversacion, Mensaje)
            .query({ partition: negocioPk(negocioId), range: { beginsWith: "CONVERSACION#" } })
            .options({ showEntityAttr: true })
            .send();

          const porTelefono = new Map<string, ResumenDeConversacion>();
          for (const registro of Items) {
            if (registro.entity !== "Conversacion") continue;
            porTelefono.set(registro.telefono, {
              contacto: { telefono: registro.telefono },
              sesionAbierta: registro.sesionAbierta,
              mensajes: [],
            });
          }
          for (const registro of Items) {
            if (registro.entity !== "Mensaje") continue;
            const { autor, texto, enviadoEn } = registro;
            porTelefono.get(registro.telefono)?.mensajes.push({ autor, texto, enviadoEn });
          }
          return [...porTelefono.values()];
        },
      };
    },
  };
}

export type Core = ReturnType<typeof crearCore>;
