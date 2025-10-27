import { Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';

interface LambdaFunction {
  name: string;
  handler: string;
  runtime: string;
  timeout: number;
  memory: number;
  environment: Record<string, string>;
  role: string;
}

interface LambdaInvocation {
  functionName: string;
  payload: any;
  invocationType: 'RequestResponse' | 'Event' | 'DryRun';
}

interface LambdaResponse {
  statusCode: number;
  payload: any;
  executionDuration: number;
  billedDuration: number;
  memoryUsed: number;
  logGroupName: string;
}

@Injectable()
export class LambdaHandlerService {
  private readonly logger = new Logger(LambdaHandlerService.name);
  private lambda: AWS.Lambda;

  constructor() {
    this.lambda = new AWS.Lambda({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async deployFunction(func: LambdaFunction, zipBuffer: Buffer): Promise<string> {
    this.logger.log(`Deploying Lambda function: ${func.name}`);

    try {
      const existingFunction = await this.lambda.getFunction({ FunctionName: func.name }).promise()
        .catch(() => null);

      if (existingFunction) {
        await this.lambda.updateFunctionCode({
          FunctionName: func.name,
          ZipFile: zipBuffer,
        }).promise();

        await this.lambda.updateFunctionConfiguration({
          FunctionName: func.name,
          Runtime: func.runtime as any,
          Handler: func.handler,
          Timeout: func.timeout,
          MemorySize: func.memory,
          Environment: { Variables: func.environment },
        }).promise();

        this.logger.log(`Lambda function updated: ${func.name}`);
      } else {
        const result = await this.lambda.createFunction({
          FunctionName: func.name,
          Runtime: func.runtime as any,
          Role: func.role,
          Handler: func.handler,
          Code: { ZipFile: zipBuffer },
          Timeout: func.timeout,
          MemorySize: func.memory,
          Environment: { Variables: func.environment },
        }).promise();

        this.logger.log(`Lambda function created: ${result.FunctionArn}`);
      }

      return func.name;
    } catch (error) {
      this.logger.error('Lambda deployment failed:', error);
      throw error;
    }
  }

  async invoke(invocation: LambdaInvocation): Promise<LambdaResponse> {
    this.logger.log(`Invoking Lambda function: ${invocation.functionName}`);

    const startTime = Date.now();

    try {
      const result = await this.lambda.invoke({
        FunctionName: invocation.functionName,
        InvocationType: invocation.invocationType,
        Payload: JSON.stringify(invocation.payload),
      }).promise();

      const executionDuration = Date.now() - startTime;

      const response: LambdaResponse = {
        statusCode: result.StatusCode || 200,
        payload: result.Payload ? JSON.parse(result.Payload.toString()) : null,
        executionDuration,
        billedDuration: executionDuration,
        memoryUsed: 128,
        logGroupName: `/aws/lambda/${invocation.functionName}`,
      };

      this.logger.log(`Lambda invocation completed in ${executionDuration}ms`);

      return response;
    } catch (error) {
      this.logger.error(`Lambda invocation failed:`, error);
      throw error;
    }
  }

  async invokeBatch(invocations: LambdaInvocation[]): Promise<LambdaResponse[]> {
    this.logger.log(`Invoking ${invocations.length} Lambda functions in batch`);

    const results = await Promise.all(
      invocations.map(inv => this.invoke(inv).catch(error => ({
        statusCode: 500,
        payload: { error: error.message },
        executionDuration: 0,
        billedDuration: 0,
        memoryUsed: 0,
        logGroupName: '',
      })))
    );

    const successCount = results.filter(r => r.statusCode === 200).length;
    this.logger.log(`Batch invocation completed: ${successCount}/${invocations.length} successful`);

    return results;
  }

  async scheduleFunction(functionName: string, schedule: string, payload: any): Promise<string> {
    const cloudwatchEvents = new AWS.CloudWatchEvents({ region: process.env.AWS_REGION });

    const ruleName = `${functionName}-scheduled`;

    try {
      await cloudwatchEvents.putRule({
        Name: ruleName,
        ScheduleExpression: schedule,
        State: 'ENABLED',
      }).promise();

      await cloudwatchEvents.putTargets({
        Rule: ruleName,
        Targets: [{
          Id: '1',
          Arn: (await this.lambda.getFunction({ FunctionName: functionName }).promise()).Configuration!.FunctionArn!,
          Input: JSON.stringify(payload),
        }],
      }).promise();

      this.logger.log(`Lambda function scheduled: ${functionName} (${schedule})`);

      return ruleName;
    } catch (error) {
      this.logger.error('Lambda scheduling failed:', error);
      throw error;
    }
  }

  async getFunctionMetrics(functionName: string, period: number = 3600): Promise<any> {
    const cloudwatch = new AWS.CloudWatch({ region: process.env.AWS_REGION });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - period * 1000);

    const metrics = await Promise.all([
      cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'Invocations',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Sum'],
      }).promise(),

      cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'Duration',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Average', 'Maximum'],
      }).promise(),

      cloudwatch.getMetricStatistics({
        Namespace: 'AWS/Lambda',
        MetricName: 'Errors',
        Dimensions: [{ Name: 'FunctionName', Value: functionName }],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300,
        Statistics: ['Sum'],
      }).promise(),
    ]);

    return {
      functionName,
      period: `${period}s`,
      invocations: metrics[0].Datapoints?.reduce((sum, dp) => sum + (dp.Sum || 0), 0) || 0,
      avgDuration: metrics[1].Datapoints?.[0]?.Average || 0,
      maxDuration: metrics[1].Datapoints?.[0]?.Maximum || 0,
      errors: metrics[2].Datapoints?.reduce((sum, dp) => sum + (dp.Sum || 0), 0) || 0,
    };
  }

  async createAlias(functionName: string, aliasName: string, version: string): Promise<void> {
    try {
      await this.lambda.createAlias({
        FunctionName: functionName,
        Name: aliasName,
        FunctionVersion: version,
      }).promise();

      this.logger.log(`Lambda alias created: ${functionName}:${aliasName} -> ${version}`);
    } catch (error) {
      this.logger.error('Alias creation failed:', error);
      throw error;
    }
  }

  async updateAliasWeights(
    functionName: string,
    aliasName: string,
    version1: string,
    version2: string,
    version2Weight: number,
  ): Promise<void> {
    try {
      await this.lambda.updateAlias({
        FunctionName: functionName,
        Name: aliasName,
        FunctionVersion: version1,
        RoutingConfig: {
          AdditionalVersionWeights: {
            [version2]: version2Weight,
          },
        },
      }).promise();

      this.logger.log(`Lambda traffic shifted: ${version1} (${100 - version2Weight}%) / ${version2} (${version2Weight}%)`);
    } catch (error) {
      this.logger.error('Traffic shifting failed:', error);
      throw error;
    }
  }

  async enableCanaryDeployment(
    functionName: string,
    newVersion: string,
    canaryPercentage: number = 10,
  ): Promise<void> {
    this.logger.log(`Enabling canary deployment: ${newVersion} at ${canaryPercentage}%`);

    const currentVersion = await this.getCurrentFunctionVersion(functionName);

    await this.updateAliasWeights(
      functionName,
      'live',
      currentVersion,
      newVersion,
      canaryPercentage,
    );

    setTimeout(async () => {
      const metrics = await this.getFunctionMetrics(functionName, 300);
      const errorRate = metrics.errors / metrics.invocations;

      if (errorRate < 0.01) {
        await this.promoteCanaryToProduction(functionName, newVersion);
      } else {
        await this.rollbackCanary(functionName, currentVersion);
      }
    }, 5 * 60 * 1000);
  }

  private async getCurrentFunctionVersion(functionName: string): Promise<string> {
    const alias = await this.lambda.getAlias({
      FunctionName: functionName,
      Name: 'live',
    }).promise();

    return alias.FunctionVersion!;
  }

  private async promoteCanaryToProduction(functionName: string, version: string): Promise<void> {
    await this.updateAliasWeights(functionName, 'live', version, version, 0);
    this.logger.log(`Canary promoted to production: ${functionName} ${version}`);
  }

  private async rollbackCanary(functionName: string, previousVersion: string): Promise<void> {
    await this.updateAliasWeights(functionName, 'live', previousVersion, previousVersion, 0);
    this.logger.warn(`Canary rollback executed: ${functionName} reverted to ${previousVersion}`);
  }

  async setupDeadLetterQueue(functionName: string, dlqArn: string): Promise<void> {
    await this.lambda.updateFunctionConfiguration({
      FunctionName: functionName,
      DeadLetterConfig: { TargetArn: dlqArn },
    }).promise();

    this.logger.log(`DLQ configured for Lambda: ${functionName}`);
  }

  async setReservedConcurrency(functionName: string, concurrency: number): Promise<void> {
    await this.lambda.putFunctionConcurrency({
      FunctionName: functionName,
      ReservedConcurrentExecutions: concurrency,
    }).promise();

    this.logger.log(`Reserved concurrency set for ${functionName}: ${concurrency}`);
  }
}

