import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
}));

import { VertexProvider, _decodeCredentials } from '../../src/providers/vertex.js';
import type { LlmRequest, ProviderAuth } from '../../src/providers/types.js';

const fixturesDir = join(__dirname, '..', '..', '__fixtures__', 'responses');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

// Minimal valid service account JSON for testing
const testServiceAccount = {
  client_email: 'test@test-project.iam.gserviceaccount.com',
  private_key:
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy5AHhl2xKxCejRNIBVaJWh\nXFANEbGRDngXfOZk9URiIhtOkkJcNfkqXiVRnGbHsTzBSBjS1dKZRifmhPW0hLRG\neE5BFiGWjxSS3hSGBiJIJHOYBPIDmFMrfFJstCVDkBSFgcLReynajGOJBVL3Vlk3\nwjDMOYNO+sUFSJFN+H+8vb4EjJjEd/DXHfiI1aLYYC59mEIJi8TiWLKB2tMBNn7w\n0jSVeRcqpfGAj0jHAsMQc/vOV6YBY+kcRdfAqJihPNRELI8OI6KiR7MKjgplAxSI\nHGCXa1qTaR3+WLH/BgiSVnSqVBzTSR+gJhDj7wIDAQABAoIBAC5RgZ+hBx7xHNaM\npP4qM4tlclICQGG/bHlM0TAaFZLMuNNFxGJMq3C6FeVcFPocLGb80GjO5GRz/lnH\nMT7NEFHI+F10wjJ2xO3pz07hrHiY/0RoFMiJDbugpjjGnGOiC2bGSM4wFv0MIWGR\npXMNAQl3f01UJ3TGxR7xQUTm9Kj+MMAO/VRB3YNJRzJMrGiC2WXR7rEU2v5g8Rw4\nlXBq7C3lm/HPidmy/k2q5MDBjMMSKoZWplOFPSQ0TpO/0f5Cqk1YDK6l/oGPFC8k\nnMhJBvN7RgS+5L9XSO8ql5flA2RYe7yCLzVOaN/2XEqLBjkrKSqVR0RzlUgS7pWH\nODEbjSECgYEA7I8LPbNLXtN1K0dD1aT4HGlKzofDkWCXpND6t1QX7VaIkDJBZ4Y0\n9aCUW4YzEl7QHEfCzmCuZXj8eLKIi3Nst1IG43IhLGSy/bvMjqjN3jWFKab6HxDQ\nkvOw3mxUNWlyYHhiS0K8SWpB9kO0kJPr1TkJQsvg7YfxeEqwAs+lQK8CgYEA4uER\nXA0qSdTxZDFDX5s/kFGHYXBnZ0WDTN+yaUSvtKrz3tFOEq0bWr1n/xk3Tv0FEHA8\n0LCEG3IpMPkq0MLxaA7VwcOFaGpH9ORHBNBjPHBoZIYGPXAB0QOEQ54HHIYdBxnx\nz3yShsjODCi/OzLqEnfXwPoYq4N1KKBlLLiXdfkCgYEAj3jnGdfOGkJ6mX3GCOGE\n/zqaBVQgh4bSJppOF6XVBX1XX4UDeJcL10YTpJ2nSdJRkb4LNQGMFCiyXBpqlb0i\nHOlQC5F16y03FBb6J//J+I5aB4L2//Nqp3M3hwQm+VaNrFbcDJNOFw7JGXMMCZ0f\njVOYFZxPvq7JmGKWJmXqpbECgYBWdK5Tq3cZP0Y5XJqFr5X2hJ2AgwkrcnIBYdXN\n3JI+RXiD6oNLFbUxBB2Cq2JOJItM0jGFjR2M2cZh1A1w08R7yPYD/XPEtxLPtJV0\nyzdAC4gGpcMm1r3x7cJnH9v7X8YKCh2P/RTAH8GfaFBCQpDJn0DP6pFBCw21XOv1\n+V6d+QKBgQCl+U68UDKgjPp3FHa+A3OFf4nO6LkXkHHcB1GFnYo/tE/0l9Kho7lZ\nR6cW5sTEl/G6y0S6Y2Ih0E+5b2YVfaRY32AF0KmJBHuEFFT5b+WjQ7EjZH9eE+jj\nyPGPQXBxYcHxRFM0xCN4FkZAF4V3OoIfPGCzseG6E0hFo8rK4B+AZA==\n-----END RSA PRIVATE KEY-----',
  project_id: 'test-project',
};

const testCredentialsBase64 = Buffer.from(JSON.stringify(testServiceAccount)).toString('base64');

const baseRequest: LlmRequest = {
  prompt: 'Hello',
  model: 'gemini-2.5-pro',
  maxTokens: 4096,
};

const validAuth: ProviderAuth = {
  googleApplicationCredentialsJson: testCredentialsBase64,
  vertexProject: 'test-project',
  vertexRegion: 'us-central1',
};

describe('VertexProvider', () => {
  const provider = new VertexProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct name', () => {
    expect(provider.name).toBe('vertex');
  });

  it('throws when credentials are missing', () => {
    expect(() => provider.validateAuth({})).toThrow(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON is required',
    );
  });

  describe('_decodeCredentials', () => {
    it('decodes valid base64 credentials', () => {
      const sa = _decodeCredentials(testCredentialsBase64);
      expect(sa.client_email).toBe('test@test-project.iam.gserviceaccount.com');
      expect(sa.project_id).toBe('test-project');
    });

    it('throws on invalid base64', () => {
      expect(() => _decodeCredentials('not-valid-json!!!')).toThrow();
    });

    it('throws when client_email is missing', () => {
      const noEmail = Buffer.from(JSON.stringify({ private_key: 'key' })).toString('base64');
      expect(() => _decodeCredentials(noEmail)).toThrow('client_email');
    });

    it('throws when private_key is missing', () => {
      const noKey = Buffer.from(
        JSON.stringify({ client_email: 'a@b.com' }),
      ).toString('base64');
      expect(() => _decodeCredentials(noKey)).toThrow('private_key');
    });
  });

  it('makes token exchange then API call', async () => {
    const tokenResponse = { access_token: 'ya29.test-token' };
    const apiResponse = loadFixture('vertex-success.json');

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve(tokenResponse) })
      .mockResolvedValueOnce({ json: () => Promise.resolve(apiResponse) });
    vi.stubGlobal('fetch', mockFetch);

    const result = await provider.call(baseRequest, validAuth);

    // First call: token exchange
    expect(mockFetch.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');
    // Second call: API
    expect(mockFetch.mock.calls[1][0]).toContain('us-central1-aiplatform.googleapis.com');
    expect(mockFetch.mock.calls[1][0]).toContain('test-project');
    expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe('Bearer ya29.test-token');

    expect(result.content).toContain('successful Vertex AI response');
  });

  it('uses project from credentials when not provided', async () => {
    const authWithoutProject: ProviderAuth = {
      googleApplicationCredentialsJson: testCredentialsBase64,
      vertexRegion: 'us-central1',
    };

    const tokenResponse = { access_token: 'ya29.test-token' };
    const apiResponse = loadFixture('vertex-success.json');

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve(tokenResponse) })
      .mockResolvedValueOnce({ json: () => Promise.resolve(apiResponse) });
    vi.stubGlobal('fetch', mockFetch);

    await provider.call(baseRequest, authWithoutProject);
    expect(mockFetch.mock.calls[1][0]).toContain('test-project');
  });

  it('throws on failed token exchange', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Token expired' }),
      }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow('Token expired');
  });

  it('throws on API error response', async () => {
    const tokenResponse = { access_token: 'ya29.test-token' };
    const apiResponse = loadFixture('vertex-error.json');

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ json: () => Promise.resolve(tokenResponse) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(apiResponse) }),
    );

    await expect(provider.call(baseRequest, validAuth)).rejects.toThrow('Permission denied');
  });
});
