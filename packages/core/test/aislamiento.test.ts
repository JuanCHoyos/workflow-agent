import { expect, it } from "vitest";
import { crearEntorno } from "./entorno.ts";

it("un Negocio no ve las Conversaciones de otro, aunque el Contacto sea el mismo", async () => {
  const { core } = crearEntorno();
  const pizzeria = await core.crearNegocio({ nombre: "Pizzería", mensajeDeBienvenida: "Hola desde la pizzería" });
  const barberia = await core.crearNegocio({ nombre: "Barbería", mensajeDeBienvenida: "Hola desde la barbería" });
  const contacto = { telefono: "+573009998877" };

  await core.negocio(pizzeria.id).recibirMensajeEntrante({ contacto, texto: "quiero una pizza" });
  await core.negocio(barberia.id).recibirMensajeEntrante({ contacto, texto: "quiero un corte" });

  const [deLaBarberia] = await core.negocio(barberia.id).listarConversaciones();
  expect(deLaBarberia?.mensajes.map((m) => m.texto)).toEqual(["quiero un corte", "Hola desde la barbería"]);
});

it("un Negocio sin mensajes no ve ninguna Conversación de otros Negocios", async () => {
  const { core } = crearEntorno();
  const conMensajes = await core.crearNegocio({ nombre: "Tienda", mensajeDeBienvenida: "Hola" });
  const sinMensajes = await core.crearNegocio({ nombre: "Papelería", mensajeDeBienvenida: "Hola" });

  await core.negocio(conMensajes.id).recibirMensajeEntrante({ contacto: { telefono: "+573001234567" }, texto: "hola" });

  expect(await core.negocio(sinMensajes.id).listarConversaciones()).toEqual([]);
});

it("rechaza mensajes para un Negocio que no existe sin enviar nada", async () => {
  const { core, canal } = crearEntorno();

  await expect(
    core.negocio("no-existe").recibirMensajeEntrante({ contacto: { telefono: "+573001234567" }, texto: "hola" }),
  ).rejects.toThrow("no existe");
  expect(canal.enviados).toEqual([]);
});
