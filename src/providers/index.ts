import type { LlmProvider, ProviderName } from './types.js';
import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { VertexProvider } from './vertex.js';

const providers: Record<ProviderName, () => LlmProvider> = {
  claude: () => new ClaudeProvider(),
  openai: () => new OpenAIProvider(),
  gemini: () => new GeminiProvider(),
  vertex: () => new VertexProvider(),
};

export function resolveProvider(name: string): LlmProvider {
  const factory = providers[name as ProviderName];
  if (!factory) {
    throw new Error(`Unknown provider: ${name}. Supported: ${Object.keys(providers).join(', ')}`);
  }
  return factory();
}
