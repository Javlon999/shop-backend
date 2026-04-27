import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("getProductsList lambda invoked", JSON.stringify(event));

  try {
    // Get all products
    const productsResult = await docClient.send(
      new ScanCommand({ TableName: process.env.PRODUCTS_TABLE })
    );

    // Get all stock
    const stockResult = await docClient.send(
      new ScanCommand({ TableName: process.env.STOCK_TABLE })
    );

    const products = productsResult.Items || [];
    const stock = stockResult.Items || [];

    // Join products with stock
    const joinedProducts = products.map((product) => {
      const stockItem = stock.find((s) => s.product_id === product.id);
      return {
        ...product,
        count: stockItem?.count ?? 0,
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(joinedProducts),
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