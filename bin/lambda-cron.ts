#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaCronStack } from '../lib/lambda-cron-stack';

const app = new cdk.App();

const stage = process.env.STAGE || 'dev';
const region = process.env.REGION || 'us-east-1';

new LambdaCronStack(app, `LambdaCronStack-${stage}`, {
  env: {
    region,
  },
  stage,
});
