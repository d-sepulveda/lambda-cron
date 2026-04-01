import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

interface LambdaCronStackProps extends cdk.StackProps {
  stage: string;
}

export class LambdaCronStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaCronStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: false,
        sourceMap: true,
      },
    };

    // Lambda: everyMinute — runs every minute
    const everyMinuteFn = new NodejsFunction(this, 'EveryMinuteFunction', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/lambdas/everyMinute/handler.ts'),
      handler: 'handler',
      functionName: `lambda-cron-everyMinute-${stage}`,
      description: 'Runs every minute',
    });

    new events.Rule(this, 'EveryMinuteRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(everyMinuteFn)],
    });

    // Lambda: every10Minutes — runs every 10 minutes at :00, :10, :20, :30, :40, :50
    const every10MinFn = new NodejsFunction(this, 'Every10MinFunction', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/lambdas/every10Minutes/handler.ts'),
      handler: 'handler',
      functionName: `lambda-cron-every10Min-${stage}`,
      description: 'Runs every 10 minutes starting at the top of the hour',
    });

    new events.Rule(this, 'Every10MinRule', {
      schedule: events.Schedule.cron({ minute: '0/10' }),
      targets: [new targets.LambdaFunction(every10MinFn)],
    });

    // Lambda: daily — runs every day at midnight UTC
    const dailyFn = new NodejsFunction(this, 'DailyFunction', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/lambdas/daily/handler.ts'),
      handler: 'handler',
      functionName: `lambda-cron-daily-${stage}`,
      description: 'Runs every day at midnight UTC',
    });

    new events.Rule(this, 'DailyRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '0' }),
      targets: [new targets.LambdaFunction(dailyFn)],
    });

    // Lambda: manual — triggered via HTTP GET /trigger
    const manualFn = new NodejsFunction(this, 'ManualFunction', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/lambdas/manual/handler.ts'),
      handler: 'handler',
      functionName: `lambda-cron-manual-${stage}`,
      description: 'Triggered manually via HTTP',
    });

    const api = new apigateway.RestApi(this, 'LambdaCronApi', {
      restApiName: `lambda-cron-api-${stage}`,
      description: 'API for manual Lambda triggers',
    });

    const trigger = api.root.addResource('trigger');
    trigger.addMethod('GET', new apigateway.LambdaIntegration(manualFn));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
