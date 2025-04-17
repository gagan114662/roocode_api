import axios from 'axios';
import { modes } from '../core/modes';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatConfig {
    apiKey?: string;
    model?: string;
}

type ModeType = 'ask' | 'code' | 'architect' | 'debug';

class ChatService {
    private static instance: ChatService;
    private apiKey: string;
    private model: string;
    private history: ChatMessage[] = [];
    private currentMode: ModeType = 'ask';

    private constructor(config: ChatConfig = {}) {
        this.apiKey = config.apiKey || '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';
        this.model = config.model || 'google/gemini-pro';
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

            // Call OpenRouter API
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

            const assistantResponse = response.data.choices[0].message.content;
            
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