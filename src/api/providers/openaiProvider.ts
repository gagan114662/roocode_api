import { Configuration, OpenAIApi } from 'openai';
import { Counter } from 'prom-client';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(configuration);

// Prometheus metrics
export const codexTokensUsed = new Counter({
    name: 'codex_api_tokens_used_total',
    help: 'Total number of tokens used in Codex API calls',
    labelNames: ['mode']
});

export const defaultConfig = {
    temperature: 0,
    top_p: 1,
    max_tokens: 2048,
    frequency_penalty: 0,
    presence_penalty: 0
};

export const createCompletion = async (prompt: string, model = 'code-davinci-002') => {
    const response = await openai.createCompletion({
        ...defaultConfig,
        model,
        prompt
    });

    codexTokensUsed.inc({ mode: 'completion' }, response.data.usage?.total_tokens || 0);
    return response.data.choices[0].text;
};

export const createChatCompletion = async (messages: any[], model = 'code-davinci-002') => {
    const response = await openai.createChatCompletion({
        ...defaultConfig,
        model,
        messages
    });

    codexTokensUsed.inc({ mode: 'chat' }, response.data.usage?.total_tokens || 0);
    return response.data.choices[0].message;
};
