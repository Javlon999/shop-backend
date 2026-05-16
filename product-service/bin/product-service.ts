#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductServiceStack } from '../lib/product-service-stack';
import { ImportServiceStack } from '../lib/import-service-stack';
import { AuthorizationServiceStack } from '../lib/authorization-service-stack';

const app = new cdk.App();

const productServiceStack = new ProductServiceStack(app, 'ProductServiceStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-southeast-2',
  },
});

const authorizationServiceStack = new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-southeast-2',
  },
});

new ImportServiceStack(app, 'ImportServiceStack', {
  catalogItemsQueue: productServiceStack.catalogItemsQueue,
  basicAuthorizerArn: authorizationServiceStack.basicAuthorizerArn,  // ← pass ARN string
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-southeast-2',
  },
});
