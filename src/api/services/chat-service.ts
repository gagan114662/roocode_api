import axios from 'axios';
import { modes } from '../core/modes';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatConfig {
    apiKey?: string;
    model?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
}

type ModeType = 'ask' | 'code' | 'architect' | 'debug';

class ChatService {
    private static instance: ChatService;
    private apiKey: string;
    private model: string;
    private ollamaUrl: string;
    private ollamaModel: string;
    private history: ChatMessage[] = [];
    private currentMode: ModeType = 'ask';

    private constructor(config: ChatConfig = {}) {
        // Use environment variable or default key
        this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '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';
        this.model = config.model || 'google/gemini-pro';
        
        // Ollama fallback configuration
        this.ollamaUrl = config.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
        this.ollamaModel = config.ollamaModel || process.env.OLLAMA_MODEL || 'llama3:latest';
    }

    public static getInstance(config?: ChatConfig): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService(config);
        }
        return ChatService.instance;
    }

    private getSystemPrompt(mode: ModeType): string {
        const prompts: Record<ModeType, string> = {
            ask: "You are a helpful AI assistant that provides clear and accurate answers to questions.",
            code: "You are a software engineering expert that provides detailed technical solutions and code examples.",
            architect: "You are a software architect focusing on system design, patterns, and best practices.",
            debug: "You are a debugging expert that helps identify and fix software issues."
        };
        
        return prompts[mode] || prompts.ask;
    }

    private async callOpenRouter(messages: ChatMessage[]): Promise<string> {
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: this.model,
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://roo-code.com',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter API error:', error);
            throw error;
        }
    }

    private async callOllama(messages: ChatMessage[]): Promise<string> {
        try {
            // Convert messages to Ollama format
            const ollamaMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await axios.post(
                `${this.ollamaUrl}/api/chat`,
                {
                    model: this.ollamaModel,
                    messages: ollamaMessages,
                    stream: false
                }
            );
            
            return response.data.message.content;
        } catch (error) {
            console.error('Ollama API error:', error);
            throw error;
        }
    }

    public async handleMessage(message: string, mode?: ModeType): Promise<string> {
        try {
            // Update mode if specified
            if (mode) {
                await modes.switch(mode);
                this.currentMode = mode;
            }

            // Prepare conversation context
            const systemPrompt = this.getSystemPrompt(this.currentMode);
            
            // Build messages array with system prompt and history
            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                ...this.history,
                { role: 'user', content: message }
            ];

            let assistantResponse: string;

            // Try OpenRouter first, fall back to Ollama if it fails
            try {
                assistantResponse = await this.callOpenRouter(messages);
                console.log('Using OpenRouter for response');
            } catch (error) {
                console.log('Falling back to Ollama');
                assistantResponse = await this.callOllama(messages);
            }
            
            // Update conversation history
            this.history.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantResponse }
            );

            // Keep conversation history manageable
            if (this.history.length > 10) {
                this.history = this.history.slice(-10);
            }

            return assistantResponse;
        } catch (error) {
            console.error('Error in chat service:', error);
            throw new Error('Failed to process message');
        }
    }

    public async getChatHistory(): Promise<ChatMessage[]> {
        return this.history;
    }

    public getCurrentMode(): ModeType {
        return this.currentMode;
    }

    public clearHistory(): void {
        this.history = [];
    }
}

// Export a singleton instance
export const chatService = ChatService.getInstance();