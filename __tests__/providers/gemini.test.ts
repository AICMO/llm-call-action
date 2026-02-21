import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
}));

import { GeminiProvider } from '../../src/providers/gemini.js';
import type { LlmRequest, ProviderAuth } from '../../src/providers/types.js';

const fixturesDir = join(__dirname, '..', '..', '__fixtures__', 'responses');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

const baseRequest: LlmRequest = {
  prompt: 'Hello',
  model: 'gemini-2.5-pro',
  maxTokens: 4096,
};

const validAuth: ProviderAuth = { apiKey: 'AIza-test-key' };

describe('GeminiProvider', () => {
  const provider = new GeminiProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('gemini');
  });

  it('throws when API key is missing', () => {
    expect(() => provider.validateAuth({})).toThrow('GOOGLE_API_KEY is required');
  });

  it('extracts content from successful response', async () => {
    const fixture = loadFixture('gemini-success.json');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(fixture),
      }),
    );

    const result = await provider.call(baseRequest, validAuth);
    expect(result.content).toContain('successful Gemini response');
  });

  it('sends correct request format with API key as query param', async () => {
    const fixture = loadFixture('gemini-success.json');
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(fixture),
    });
    vi.stubGlobal('fetch', mockFetch);

    await provider.call(baseRequest, validAuth);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('key=AIza-test-key');
    expect(url).toContain('gemini-2.5-pro:generateContent');
    expect(JSON.parse(options.body)).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      generationConfig: { maxOutputTokens: 4096 },
    });
  });

  it('throws on API error response', async () => {
    const fixture = loadFixture('gemini-error.json');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(fixture),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow(
      'API key not valid',
    );
  });

  it('throws when response has no content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ candidates: [] }),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow('returned no content');
  });
});
