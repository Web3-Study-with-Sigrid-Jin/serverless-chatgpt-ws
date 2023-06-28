import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';
import { DynamoDB } from 'aws-sdk';
import { newApiGatewayManagementApi } from '@yingyeothon/aws-apigateway-management-api';
import { APIGatewayProxyEvent } from 'aws-lambda';

interface MessageBody {
  prompt: string;
  conversationId: string;
}

const configuration = new Configuration({
  apiKey: 'your-api-key-here',
});

const openai = new OpenAIApi(configuration);

const conversations: { [key: string]: Array<{ role: ChatCompletionRequestMessageRoleEnum; content: string }> } = {};

export const connect = async (event: APIGatewayProxyEvent) => {
  await new DynamoDB()
    .putItem({
      TableName: 'ConnectionIds',
      Item: {
        connectionId: { S: event.requestContext.connectionId! },
      },
    })
    .promise();
  return {
    statusCode: 200,
    body: JSON.stringify({ msg: 'OK' }),
  };
};

export const disconnect = async (event: APIGatewayProxyEvent) => {
  delete conversations[event.requestContext.connectionId!];
  await new DynamoDB()
    .deleteItem({
      TableName: 'ConnectionIds',
      Key: {
        connectionId: { S: event.requestContext.connectionId! },
      },
    })
    .promise();
  return {
    statusCode: 200,
    body: JSON.stringify({ msg: 'OK' }),
  };
};

export const message = async (event: APIGatewayProxyEvent) => {
  const { prompt, conversationId }: MessageBody = JSON.parse(event.body!);

  console.log('prompt', prompt);

  if (!conversations[conversationId]) {
    conversations[conversationId] = [
      { role: 'system', content: '중고나라에서 물품 판매하는 사람처럼 행동하라. 너는 이제 구매자와 대화하게 될 것이다. 구매자와 중고 물건을 판매한다고 생각하고 최대한 높은 가격에 팔기 위해 노력하라. 너는 동네 50대 한국인 아줌마처럼 생각하고 행동하고 답해야 한다. 경어체를 쓰지 말고 반말체를 사용하라.' },
    ];
  }

  conversations[conversationId].push({ role: 'user', content: prompt });

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo-16k',
    messages: conversations[conversationId],
    temperature: 0.6,
    max_tokens: 100,
  });

  const openaiResponse = completion.data.choices[0].message.content;

  conversations[conversationId].push({ role: 'assistant', content: openaiResponse });

  console.log('openaiResponse', openaiResponse);

  const dbResult = await new DynamoDB()
    .scan({
      TableName: 'ConnectionIds',
      ProjectionExpression: 'connectionId',
    })
    .promise();

  const api = newApiGatewayManagementApi({
    endpoint: event.requestContext.domainName! + '/' + event.requestContext.stage!,
  });

  console.log('dbResult', dbResult);

  await Promise.all(
    dbResult.Items.map(({ connectionId }) =>
      api
        .postToConnection({
          ConnectionId: connectionId.S,
          Data: JSON.stringify({
            message: openaiResponse,
            conversationId,
          }),
        })
        .promise(),
    ),
  );

  console.log('api', api);

  return {
    statusCode: 200,
    body: JSON.stringify({ msg: 'OK' }),
  };
};