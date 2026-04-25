import { APIGatewayProxyEvent, APIGatewayProxyResult }  from "aws-lambda";;
import { products } from "./products";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("getProductsList lambda invoked", JSON.stringify(event));

  try {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(products),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};