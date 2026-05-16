import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dotenv from 'dotenv';

dotenv.config();

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizer = new NodejsFunction(this, 'BasicAuthorizerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/basicAuthorizer.ts'),
      functionName: 'basicAuthorizer',
      environment: {
        [process.env.GITHUB_LOGIN!]: process.env.TEST_PASSWORD!,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    // Export ARN as a string property
    this.basicAuthorizerArn = basicAuthorizer.functionArn;
  }
}
