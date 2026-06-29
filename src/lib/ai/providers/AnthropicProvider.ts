import Anthropic from '@anthropic-ai/sdk';
import type { IAIProvider, AIProviderRequest, AIProviderResponse } from './IAIProvider';

export class AnthropicProvider implements IAIProvider {
  private client: Anthropic;
  private model:  string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey });
    this.model  = model;
  }

  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const userContent: Anthropic.MessageParam['content'] = request.imageBase64
      ? [
          {
            type:   'image',
            source: {
              type:       'base64',
              media_type: request.imageMimeType ?? 'image/jpeg',
              data:        request.imageBase64,
            },
          },
          { type: 'text', text: request.userMessage },
        ]
      : request.userMessage;

    const msg = await this.client.messages.create({
      model:      this.model,
      max_tokens: 2048,
      system:     request.systemPrompt,
      messages:   [{ role: 'user', content: userContent }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';

    return {
      text,
      model: msg.model,
      usage: {
        inputTokens:  msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
    };
  }
}
