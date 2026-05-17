import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3notifications from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface ImportServiceStackProps extends cdk.StackProps {
  catalogItemsQueue: sqs.Queue;
  basicAuthorizerArn: string; // ← changed to string ARN
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    const { catalogItemsQueue, basicAuthorizerArn } = props;

    // Look up the lambda by ARN instead of passing the object directly
    const basicAuthorizer = lambda.Function.fromFunctionAttributes(
      this,
      "BasicAuthorizerLambda",
      {
        functionArn: basicAuthorizerArn,
        sameEnvironment: true,
      },
    );

    const bucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: "javlonbek-import-service-bucket-v2",
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

    const importProductsFile = new NodejsFunction(this, "importProductsFile", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/importProductsFile.ts"),
      functionName: "importProductsFile",
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    bucket.grantPut(importProductsFile);

    const importFileParser = new NodejsFunction(this, "importFileParser", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/importFileParser.ts"),
      functionName: "importFileParser",
      environment: {
        BUCKET_NAME: bucket.bucketName,
        CATALOG_ITEMS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    bucket.grantReadWrite(importFileParser);
    catalogItemsQueue.grantSendMessages(importFileParser);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notifications.LambdaDestination(importFileParser),
      { prefix: "uploaded/" },
    );

    // API Gateway
    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Amz-User-Agent",
        ],
      },
    });

    // Lambda Authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, "BasicAuthorizer", {
      handler: basicAuthorizer,
      identitySource: "method.request.header.Authorization",
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    // Grant API Gateway permission to invoke the authorizer lambda
    basicAuthorizer.grantInvoke(
      new iam.ServicePrincipal("apigateway.amazonaws.com"),
    );

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      },
    );

    new cdk.CfnOutput(this, "ImportApiUrl", {
      value: api.url,
    });
  }
}
