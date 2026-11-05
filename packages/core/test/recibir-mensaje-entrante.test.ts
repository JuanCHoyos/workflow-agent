import { expect, it } from "vitest";
import { crearEntorno } from "./entorno.ts";

const CONTACTO = { telefono: "+573001112233" };

it("responde al Contacto con el Mensaje del Flujo fijo del Negocio", async () => {
  const { core, canal } = crearEntorno();
  const negocio = await core.crearNegocio({
    nombre: "Pizzería Don Tito",
    mensajeDeBienvenida: "¡Hola! Bienvenido a Pizzería Don Tito 🍕",
  });

  await core.negocio(negocio.id).recibirMensajeEntrante({ contacto: CONTACTO, texto: "hola" });

  expect(canal.enviados).toEqual([
    {
      negocioId: negocio.id,
      telefono: "+573001112233",
      texto: "¡Hola! Bienvenido a Pizzería Don Tito 🍕",
    },
  ]);
});

it("registra la Conversación con una Sesión abierta y los mensajes intercambiados", async () => {
  const { core } = crearEntorno();
  const { id } = await core.crearNegocio({
    nombre: "Panadería La Espiga",
    mensajeDeBienvenida: "Hola, ¿qué pan te provoca hoy?",
  });
  const negocio = core.negocio(id);

  await negocio.recibirMensajeEntrante({ contacto: CONTACTO, texto: "buenas" });

  expect(await negocio.listarConversaciones()).toEqual([
    {
      contacto: { telefono: "+573001112233" },
      sesionAbierta: true,
      mensajes: [
        { autor: "contacto", texto: "buenas", enviadoEn: "2026-11-05T15:00:00.000Z" },
        { autor: "bot", texto: "Hola, ¿qué pan te provoca hoy?", enviadoEn: "2026-11-05T15:00:00.000Z" },
      ],
    },
  ]);
});
