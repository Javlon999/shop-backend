import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== S3 Bucket ====================

    const importBucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: "javlonbek-test-import-service-bucket", // Change this to something unique!
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // ==================== Lambda Functions ====================

    // Lambda: importProductsFile
    const importProductsFile = new NodejsFunction(
      this,
      "ImportProductsFileFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/importProductsFile.ts"),
        functionName: "importProductsFile",
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
        bundling: {
          forceDockerBundling: false,
        },
      }
    );

    // Lambda: importFileParser
    const importFileParser = new NodejsFunction(
      this,
      "ImportFileParserFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/importFileParser.ts"),
        functionName: "importFileParser",
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
        bundling: {
          forceDockerBundling: false,
        },
      }
    );

    // ==================== Permissions ====================

    importBucket.grantReadWrite(importProductsFile);
    importBucket.grantReadWrite(importFileParser);

    // ==================== S3 Event Notification ====================

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/" }
    );

    // ==================== API Gateway ====================

    const api = new apigateway.RestApi(this, "ImportServiceApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
    });

    // GET /import
    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
      }
    );

    // Output the API URL
    new cdk.CfnOutput(this, "ImportApiUrl", {
      value: api.url ?? "Something went wrong",
      description: "Import Service API Gateway URL",
    });
  }
}