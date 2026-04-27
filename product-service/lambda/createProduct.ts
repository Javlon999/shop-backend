import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("createProduct lambda invoked", JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || "{}");

    // Validate input
    if (!body.title || !body.price) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Product data is invalid. Title and price are required.",
        }),
      };
    }

    const productId = uuidv4();

    // Insert into products table
    await docClient.send(
      new PutCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Item: {
          id: productId,
          title: body.title,
          description: body.description || "",
          price: body.price,
        },
      })
    );

    // Insert into stock table
    await docClient.send(
      new PutCommand({
        TableName: process.env.STOCK_TABLE,
        Item: {
          product_id: productId,
          count: body.count ?? 0,
        },
      })
    );

    const newProduct = {
      id: productId,
      title: body.title,
      description: body.description || "",
      price: body.price,
      count: body.count ?? 0,
    };

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(newProduct),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};