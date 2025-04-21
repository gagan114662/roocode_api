import {
	ApiProvider,
	ModelInfo,
	anthropicModels,
	openAiNativeModels,
	REASONING_MODELS,
} from "../../../../src/shared/api"

export { REASONING_MODELS }

export const MODELS_BY_PROVIDER: Partial<Record<ApiProvider, Record<string, ModelInfo>>> = {
	anthropic: anthropicModels,
	"openai-native": openAiNativeModels,
}

export const PROVIDERS = [
	{ value: "anthropic", label: "Anthropic" },
	{ value: "openai", label: "OpenAI" },
	{ value: "ollama", label: "Ollama" },
]

export const VERTEX_REGIONS = [
	{ value: "us-east5", label: "us-east5" },
	{ value: "us-central1", label: "us-central1" },
	{ value: "europe-west1", label: "europe-west1" },
	{ value: "europe-west4", label: "europe-west4" },
	{ value: "asia-southeast1", label: "asia-southeast1" },
]
