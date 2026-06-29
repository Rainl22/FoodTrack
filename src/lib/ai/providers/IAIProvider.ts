// Provider-agnostic AI interface.
// AIService depends on this — never on a specific SDK.

export interface AIProviderRequest {
  systemPrompt: string;
  userMessage:  string;
  imageBase64?:   string;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export interface AIProviderResponse {
  text:  string;
  model: string;
  usage: {
    inputTokens:  number;
    outputTokens: number;
  };
}

export interface IAIProvider {
  complete(request: AIProviderRequest): Promise<AIProviderResponse>;
}
