import { execFileSync } from "node:child_process";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { crearTablas } from "../src/index.ts";
import { ENDPOINT, NOMBRES_DE_TABLAS, crearClienteLocal } from "./entorno.ts";

const CONTENEDOR = "workflow-agent-dynamodb-local";

async function disponible(cliente: DynamoDBClient) {
  try {
    await cliente.send(new ListTablesCommand({}));
    return true;
  } catch {
    return false;
  }
}

export default async function setup() {
  const cliente = crearClienteLocal();
  if (!(await disponible(cliente))) {
    if (process.env.DYNAMODB_ENDPOINT) {
      throw new Error(`DynamoDB Local no responde en ${ENDPOINT}`);
    }
    execFileSync("docker", [
      "run", "-d", "--rm", "--name", CONTENEDOR, "-p", "8000:8000",
      "amazon/dynamodb-local", "-jar", "DynamoDBLocal.jar", "-inMemory", "-sharedDb",
    ]);
    for (let intento = 0; !(await disponible(cliente)); intento++) {
      if (intento > 60) throw new Error("DynamoDB Local no arrancó a tiempo");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await crearTablas(cliente, NOMBRES_DE_TABLAS);
}
