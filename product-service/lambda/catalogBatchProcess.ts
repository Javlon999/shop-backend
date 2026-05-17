import { SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const snsClient = new SNSClient({ region: "ap-southeast-2" });

export const handler = async (event: SQSEvent) => {
  console.log("Received SQS event:", JSON.stringify(event));

  for (const record of event.Records) {
    const product = JSON.parse(record.body);
    const id = randomUUID();

    await docClient.send(new PutCommand({
      TableName: process.env.PRODUCTS_TABLE,  // ← matches your stack
      Item: {
        id,
        title: product.title,
        description: product.description,
        price: Number(product.price),
      },
    }));

    await docClient.send(new PutCommand({
      TableName: process.env.STOCK_TABLE,  // ← matches your stack
      Item: {
        product_id: id,
        count: Number(product.count),
      },
    }));

    await snsClient.send(new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject: "New Product Created",
      Message: JSON.stringify({ id, ...product }),
    }));

    console.log("Product created and SNS notified:", { id, ...product });
  }
};