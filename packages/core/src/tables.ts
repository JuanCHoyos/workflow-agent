import {
  CreateTableCommand,
  ResourceInUseException,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "dynamodb-toolbox/table";

/** Physical table names: provided by SST in AWS, fixed in tests. */
export type TableNames = {
  businesses: string;
  conversations: string;
};

const KEYS = {
  partitionKey: { name: "pk", type: "string" },
  sortKey: { name: "sk", type: "string" },
} as const;

export function buildTables(dynamodb: DynamoDBClient, names: TableNames) {
  const documentClient = DynamoDBDocumentClient.from(dynamodb, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return {
    businesses: new Table({ name: names.businesses, documentClient, ...KEYS }),
    conversations: new Table({ name: names.conversations, documentClient, ...KEYS }),
  };
}

export type Tables = ReturnType<typeof buildTables>;

/** Creates the tables if they don't exist. Local and test environments only. */
export async function createTables(dynamodb: DynamoDBClient, names: TableNames) {
  for (const name of Object.values(names)) {
    try {
      await dynamodb.send(
        new CreateTableCommand({
          TableName: name,
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
