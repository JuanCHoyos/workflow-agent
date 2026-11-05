import {
  CreateTableCommand,
  ResourceInUseException,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "dynamodb-toolbox/table";

/** Nombres físicos de las tablas; en AWS los provee SST, en pruebas son fijos. */
export type NombresDeTablas = {
  negocios: string;
  conversaciones: string;
};

const LLAVES = {
  partitionKey: { name: "pk", type: "string" },
  sortKey: { name: "sk", type: "string" },
} as const;

export function construirTablas(dynamodb: DynamoDBClient, nombres: NombresDeTablas) {
  const documentClient = DynamoDBDocumentClient.from(dynamodb, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return {
    negocios: new Table({ name: nombres.negocios, documentClient, ...LLAVES }),
    conversaciones: new Table({ name: nombres.conversaciones, documentClient, ...LLAVES }),
  };
}

export type Tablas = ReturnType<typeof construirTablas>;

/** Crea las tablas si no existen. Solo para entornos locales y de prueba. */
export async function crearTablas(dynamodb: DynamoDBClient, nombres: NombresDeTablas) {
  for (const nombre of Object.values(nombres)) {
    try {
      await dynamodb.send(
        new CreateTableCommand({
          TableName: nombre,
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [
            { AttributeName: "pk", AttributeType: "S" },
            { AttributeName: "sk", AttributeType: "S" },
          ],
          KeySchema: [
            { AttributeName: "pk", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
        }),
      );
    } catch (error) {
      if (!(error instanceof ResourceInUseException)) throw error;
    }
  }
}
