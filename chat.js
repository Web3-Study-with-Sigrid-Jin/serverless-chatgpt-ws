import Ably from 'ably/promises';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const client = new Ably.Realtime(process.env.ABLY_API_KEY);
let channel = null;

// In-memory cache object for conversations
const conversations = {};

client.connection.once('connected', () => {
    channel = client.channels.get('chat');
    channel.presence.enter();

    channel.subscribe('message', async(message) => {
        const { prompt, conversationId } = message.data;

        // If this is a new conversation, initialize it with a system message
        if (!conversations[conversationId]) {
            conversations[conversationId] = '중고나라에서 물품 판매하는 사람처럼 행동하라. 너는 이제 구매자와 대화하게 될 것이다.';
        }

        // Append the new message to the conversation history
        conversations[conversationId] += '\n' + prompt;

        const completion = await openai.createCompletion({
            model: 'gpt-3.5-turbo-16k',
            prompt: conversations[conversationId],
            temperature: 0.6,
            max_tokens: 100,
        });

        const openaiResponse = completion.data.choices[0].text;

        // Append the AI's response to the conversation history
        conversations[conversationId] += '\nAI: ' + openaiResponse;

        channel.publish('message', { message: openaiResponse });
    });
});
