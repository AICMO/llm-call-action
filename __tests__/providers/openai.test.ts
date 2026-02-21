import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
}));

import { OpenAIProvider } from '../../src/providers/openai.js';
import type { LlmRequest, ProviderAuth } from '../../src/providers/types.js';

const fixturesDir = join(__dirname, '..', '..', '__fixtures__', 'responses');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

const baseRequest: LlmRequest = {
  prompt: 'Hello',
  model: 'gpt-4o',
  maxTokens: 4096,
};

const validAuth: ProviderAuth = { apiKey: 'sk-test-key' };

describe('OpenAIProvider', () => {
  const provider = new OpenAIProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('throws when API key is missing', () => {
    expect(() => provider.validateAuth({})).toThrow('OPENAI_API_KEY is required');
  });

  it('extracts content from successful response', async () => {
    const fixture = loadFixture('openai-success.json');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(fixture),
      }),
    );

    const result = await provider.call(baseRequest, validAuth);
    expect(result.content).toContain('successful OpenAI response');
  });

  it('sends correct request format', async () => {
    const fixture = loadFixture('openai-success.json');
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(fixture),
    });
    vi.stubGlobal('fetch', mockFetch);

    await provider.call(baseRequest, validAuth);

    expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-test-key',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
  });

  it('throws on API error response', async () => {
    const fixture = loadFixture('openai-error.json');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(fixture),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow(
      'Incorrect API key provided',
    );
  });

  it('throws when response has no content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ choices: [] }),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow('returned no content');
  });
});
