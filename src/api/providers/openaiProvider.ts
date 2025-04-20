import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(configuration);

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

    return response.data.choices[0].text;
};

export const createChatCompletion = async (messages: any[], model = 'gpt-4') => {
    const response = await openai.createChatCompletion({
        ...defaultConfig,
        model,
        messages
    });

    return response.data.choices[0].message;
};
