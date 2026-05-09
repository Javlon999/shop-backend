import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      "products"
    );

    const stockTable = dynamodb.Table.fromTableName(
      this,
      "StockTable",
      "stock"
    );

    // ==================== Lambda Functions ====================

    // Lambda: getProductsList
    const getProductsList = new NodejsFunction(this, "GetProductsListFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getProductsList.ts"),
      functionName: "getProductsList",
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    // Lambda: getProductsById
    const getProductsById = new NodejsFunction(this, "GetProductsByIdFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getProductsById.ts"),
      functionName: "getProductsById",
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    // Lambda: createProduct
    const createProduct = new NodejsFunction(this, "CreateProductFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/createProduct.ts"),
      functionName: "createProduct",
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    // ==================== Permissions ====================

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);

    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);

    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

    // ==================== API Gateway ====================

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
      new apigateway.LambdaIntegration(getProductsList)
    );

    // POST /products
    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProduct)
    );

    // GET /products/{productId}
    const singleProductResource = productsResource.addResource("{productId}");
    singleProductResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsById)
    );

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong",
      description: "API Gateway URL",
    });
  }
}