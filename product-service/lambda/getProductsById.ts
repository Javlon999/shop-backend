import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("getProductsById lambda invoked", JSON.stringify(event));

  try {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    // Get product by ID
    const productResult = await docClient.send(
      new GetCommand({
        TableName: process.env.PRODUCTS_TABLE,
        Key: { id: productId },
      })
    );

    if (!productResult.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    // Get stock for this product
    const stockResult = await docClient.send(
      new GetCommand({
        TableName: process.env.STOCK_TABLE,
        Key: { product_id: productId },
      })
    );

    // Join product with stock
    const product = {
      ...productResult.Item,
      count: stockResult.Item?.count ?? 0,
    };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(product),
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