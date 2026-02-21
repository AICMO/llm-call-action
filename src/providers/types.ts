export interface LlmRequest {
  prompt: string;
  model: string;
  maxTokens: number;
}

export interface LlmResponse {
  content: string;
  rawResponse: unknown;
}

export interface ProviderAuth {
  apiKey?: string;
  googleApplicationCredentialsJson?: string;
  vertexProject?: string;
  vertexRegion?: string;
}

export interface LlmProvider {
  readonly name: string;
  validateAuth(auth: ProviderAuth): void;
  call(request: LlmRequest, auth: ProviderAuth): Promise<LlmResponse>;
}

export type ProviderName = 'claude' | 'openai' | 'gemini' | 'vertex';

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-pro',
  vertex: 'gemini-2.5-pro',
};
