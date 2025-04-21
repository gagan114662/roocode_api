import { ApiHandlerOptions, ModelInfo } from "../../shared/api";

export interface ModelParamsInput {
    options: ApiHandlerOptions;
    model: ModelInfo;
    defaultMaxTokens?: number;
}

export interface ModelParams {
    temperature: number;
    maxTokens: number;
    thinking?: boolean;
    thinkingBudget?: number;
}

export function getModelParams({ options, model, defaultMaxTokens = 2048 }: ModelParamsInput): ModelParams {
    const isThinkingModel = model.id?.endsWith(":thinking");
    const temperature = options.temperature ?? 0.7;

    let maxTokens: number;
    if (isThinkingModel) {
        maxTokens = options.customMaxTokens || model.maxTokens || defaultMaxTokens;
    } else {
        maxTokens = model.maxTokens || defaultMaxTokens;
    }

    if (isThinkingModel) {
        const customThinkingTokens = options.customMaxThinkingTokens;
        const defaultThinkingBudget = Math.floor(maxTokens * 0.8);
        const minThinkingBudget = 1024;
        
        let thinkingBudget = customThinkingTokens || defaultThinkingBudget;
        thinkingBudget = Math.max(minThinkingBudget, thinkingBudget);
        thinkingBudget = Math.min(thinkingBudget, defaultThinkingBudget);

        return { 
            temperature, 
            maxTokens, 
            thinking: true, 
            thinkingBudget 
        };
    }

    return { temperature, maxTokens };
}
