import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class ProductServiceStack extends cdk.Stack {
  // ← expose queue so ImportServiceStack can use it
  public readonly catalogItemsQueue: sqs.Queue;

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

    // ==================== Task 6: SQS Queue ====================

    this.catalogItemsQueue = new sqs.Queue(this, "catalogItemsQueue", {
      queueName: "catalogItemsQueue",
    });

    // ==================== Task 6: SNS Topic ====================

    const createProductTopic = new sns.Topic(this, "createProductTopic", {
      topicName: "createProductTopic",
    });

    // Add your email subscription here
    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription("javlonbeksuyunov9997@gmail.com")
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

    // Lambda: catalogBatchProcess (Task 6)
    const catalogBatchProcess = new NodejsFunction(this, "CatalogBatchProcessFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/catalogBatchProcess.ts"),
      functionName: "catalogBatchProcess",
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCK_TABLE: stockTable.tableName,
        SNS_TOPIC_ARN: createProductTopic.topicArn,
      },
      bundling: {
        minify: false,
        sourceMap: true,
        target: "node20",
  },
    });

    // ==================== Permissions ====================

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);

    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);

    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

    // Task 6 permissions
    productsTable.grantWriteData(catalogBatchProcess);
    stockTable.grantWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);
    this.catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
    
    // SQS triggers catalogBatchProcess with batchSize 5
    catalogBatchProcess.addEventSource(
      new SqsEventSource(this.catalogItemsQueue, {
        batchSize: 5,
      })
    );
   
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

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong",
      description: "API Gateway URL",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueUrl", {
      value: this.catalogItemsQueue.queueUrl,
      description: "SQS Queue URL",
    });

    new cdk.CfnOutput(this, "CatalogItemsQueueArn", {
      value: this.catalogItemsQueue.queueArn,
      description: "SQS Queue ARN",
    });

    new cdk.CfnOutput(this, "CreateProductTopicArn", {
      value: createProductTopic.topicArn,
      description: "SNS Topic ARN",
    });
  }
}