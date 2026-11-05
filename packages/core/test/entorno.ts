import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { crearCore, type Canal, type MensajeSaliente, type Reloj } from "../src/index.ts";

export const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";

export const NOMBRES_DE_TABLAS = {
  negocios: "test-Negocios",
  conversaciones: "test-Conversaciones",
};

export function crearClienteLocal() {
  return new DynamoDBClient({
    endpoint: ENDPOINT,
    region: "local",
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });
}

export class CanalFalso implements Canal {
  enviados: MensajeSaliente[] = [];
  async enviar(mensaje: MensajeSaliente) {
    this.enviados.push(mensaje);
  }
}

export class RelojFalso implements Reloj {
  constructor(private actual = new Date("2026-11-05T15:00:00Z")) {}
  ahora() {
    return this.actual;
  }
  avanzar(minutos: number) {
    this.actual = new Date(this.actual.getTime() + minutos * 60_000);
  }
}

export function crearEntorno() {
  const canal = new CanalFalso();
  const reloj = new RelojFalso();
  const core = crearCore({
    dynamodb: crearClienteLocal(),
    tablas: NOMBRES_DE_TABLAS,
    canal,
    reloj,
  });
  return { core, canal, reloj };
}
