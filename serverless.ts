import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'websocket-chat',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    region: 'us-east-1',
    stage: 'dev',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:PutItem',
              'dynamodb:GetItem',
              'dynamodb:DeleteItem',
              'dynamodb:Scan',
            ],
            Resource: {
              'Fn::Sub': [
                'arn:aws:dynamodb:${region}:*:table/ConnectionIds',
                {
                  region: '${aws:region}',
                },
              ],
            },
          },
        ],
      },
    },
  },
  functions: {
    connect: {
      handler: 'src/functions/hello/handler.connect',
      events: [
        {
          websocket: {
            route: '$connect',
          },
        },
      ],
    },
    disconnect: {
      handler: 'src/functions/hello/handler.disconnect',
      events: [
        {
          websocket: {
            route: '$disconnect',
          },
        },
      ],
    },
    message: {
      handler: 'src/functions/hello/handler.message',
      events: [
        {
          websocket: {
            route: 'message',
          },
        },
      ],
    },
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;