#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductServiceStack } from "../lib/product-service-stack";
import { ImportServiceStack } from "../lib/import-service-stack";

const app = new cdk.App();

new ProductServiceStack(app, "ProductServiceStack", {
  env: {
    region: "ap-southeast-2",
  },
});

new ImportServiceStack(app, "ImportServiceStack", {
  env: {
    region: "ap-southeast-2",
  },
});