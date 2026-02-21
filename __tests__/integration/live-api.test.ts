import { describe, it, expect, beforeAll } from 'vitest';
import { ClaudeProvider } from '../../src/providers/claude.js';
import { OpenAIProvider } from '../../src/providers/openai.js';
import { GeminiProvider } from '../../src/providers/gemini.js';
import { VertexProvider } from '../../src/providers/vertex.js';
import { DEFAULT_MODELS } from '../../src/providers/types.js';
import type { LlmRequest, ProviderAuth } from '../../src/providers/types.js';

const SKIP = process.env.INTEGRATION !== 'true';

const simpleRequest: LlmRequest = {
  prompt: 'Respond with exactly: "Hello from integration test"',
  model: '',
  maxTokens: 256,
};

describe.skipIf(SKIP)('Live API integration tests', () => {
  describe('Claude', () => {
    const provider = new ClaudeProvider();
    const auth: ProviderAuth = { apiKey: process.env.ANTHROPIC_API_KEY };

    it('returns a non-empty response', async () => {
      const request = { ...simpleRequest, model: DEFAULT_MODELS.claude };
      const result = await provider.call(request, auth);
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAI', () => {
    const provider = new OpenAIProvider();
    const auth: ProviderAuth = { apiKey: process.env.OPENAI_API_KEY };

    it('returns a non-empty response', async () => {
      const request = { ...simpleRequest, model: DEFAULT_MODELS.openai };
      const result = await provider.call(request, auth);
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe('Gemini', () => {
    const provider = new GeminiProvider();
    const auth: ProviderAuth = { apiKey: process.env.GOOGLE_API_KEY };

    it('returns a non-empty response', async () => {
      const request = { ...simpleRequest, model: DEFAULT_MODELS.gemini };
      const result = await provider.call(request, auth);
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe('Vertex AI', () => {
    const provider = new VertexProvider();
    const auth: ProviderAuth = {
      googleApplicationCredentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      vertexProject: process.env.VERTEX_PROJECT,
      vertexRegion: 'us-central1',
    };

    it('returns a non-empty response', async () => {
      const request = { ...simpleRequest, model: DEFAULT_MODELS.vertex };
      const result = await provider.call(request, auth);
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
