import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
}));

import { ClaudeProvider } from '../../src/providers/claude.js';
import type { LlmRequest, ProviderAuth } from '../../src/providers/types.js';

const fixturesDir = join(__dirname, '..', '..', '__fixtures__', 'responses');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

const baseRequest: LlmRequest = {
  prompt: 'Hello',
  model: 'claude-sonnet-4-6',
  maxTokens: 4096,
};

const validAuth: ProviderAuth = { apiKey: 'sk-ant-test-key' };

describe('ClaudeProvider', () => {
  const provider = new ClaudeProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('claude');
  });

  it('throws when API key is missing', () => {
    expect(() => provider.validateAuth({})).toThrow('ANTHROPIC_API_KEY is required');
  });

  it('validates auth with API key', () => {
    expect(() => provider.validateAuth(validAuth)).not.toThrow();
  });

  it('extracts content from successful response', async () => {
    const fixture = loadFixture('claude-success.json');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(fixture),
      }),
    );

    const result = await provider.call(baseRequest, validAuth);
    expect(result.content).toContain('successful Claude response');
    expect(result.rawResponse).toEqual(fixture);
  });

  it('sends correct request format', async () => {
    const fixture = loadFixture('claude-success.json');
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(fixture),
    });
    vi.stubGlobal('fetch', mockFetch);

    await provider.call(baseRequest, validAuth);

    expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'sk-ant-test-key',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
  });

  it('throws on API error response', async () => {
    const fixture = loadFixture('claude-error.json');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(fixture),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow('invalid x-api-key');
  });

  it('throws when response has no content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ content: [] }),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow('returned no content');
  });
});
