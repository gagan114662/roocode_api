import { OpenAIApi, Configuration } from 'openai';
import { validateWithRetry } from '../utils/validator';
import { ImageAnalysis } from '../types/analysis';

export class OpenAIProvider {
  private client: OpenAIApi;
  private readonly config = {
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  };

  constructor() {
    this.client = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    }));
  }

  async chatWithImages(
    prompt: string,
    images: Array<{ path: string; type: string }>,
    functions?: any[]
  ) {
    const imageContents = await Promise.all(
      images.map(async img => ({
        type: 'image_url',
        image_url: {
          url: `data:${img.type};base64,${await this.getImageBase64(img.path)}`
        }
      }))
    );

    const generateResponse = async () => {
      const response = await this.client.createChatCompletion({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents
            ]
          }
        ],
        ...this.config,
        functions
      });

      return JSON.parse(response.data.choices[0].message?.content || '{}');
    };

    // Validate and retry if needed
    return await validateWithRetry<ImageAnalysis>(
      'imageAnalysis',
      generateResponse
    );
  }

  private async getImageBase64(path: string): Promise<string> {
    const buffer = await fs.readFile(path);
    return buffer.toString('base64');
  }
}
