import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda: getProductsList
    const getProductsList = new NodejsFunction(
      this,
      "GetProductsListFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/getProductsList.ts"),
        functionName: "getProductsList",
        bundling: {
          forceDockerBundling: false,
        },
      },
    );

    // Lambda: getProductsById
    const getProductsById = new NodejsFunction(
      this,
      "GetProductsByIdFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/getProductsById.ts"),
        functionName: "getProductsById",
        bundling: {
          forceDockerBundling: false,
        },
      },
    );

    // API Gateway
    const api = new apigateway.RestApi(this, "ProductServiceApi", {
      restApiName: "Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
    });

    // GET /products
    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList),
    );

    // GET /products/{productId}
    const singleProductResource = productsResource.addResource("{productId}");
    singleProductResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsById),
    );

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong",
      description: "API Gateway URL",
    });
  }
}
