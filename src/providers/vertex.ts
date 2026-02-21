import * as core from '@actions/core';
import { createSign } from 'node:crypto';
import { base64url } from '../utils.js';
import type { LlmProvider, LlmRequest, LlmResponse, ProviderAuth } from './types.js';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function buildJwt(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = base64url(
    Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp,
      }),
    ),
  );

  const signInput = `${header}.${claim}`;
  const sign = createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = base64url(sign.sign(sa.private_key));

  return `${header}.${claim}.${signature}`;
}

function decodeCredentials(base64Json: string): ServiceAccount {
  let decoded: string;
  try {
    decoded = Buffer.from(base64Json, 'base64').toString('utf-8');
  } catch {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON must be base64-encoded. Encode it with: base64 < service-account.json',
    );
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(decoded);
  } catch {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON must be base64-encoded JSON. Encode it with: base64 < service-account.json',
    );
  }

  if (!sa.client_email) {
    throw new Error('Could not extract client_email from service account JSON');
  }
  if (!sa.private_key) {
    throw new Error('Could not extract private_key from service account JSON');
  }

  return sa;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = buildJwt(sa);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await response.json();

  if (!data.access_token) {
    const errorMsg = data.error_description || data.error || 'unknown error';
    throw new Error(`Failed to get access token: ${errorMsg}`);
  }

  return data.access_token as string;
}

export class VertexProvider implements LlmProvider {
  readonly name = 'vertex';

  validateAuth(auth: ProviderAuth): void {
    if (!auth.googleApplicationCredentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required for the Vertex provider');
    }
  }

  async call(request: LlmRequest, auth: ProviderAuth): Promise<LlmResponse> {
    this.validateAuth(auth);
    core.info(`Calling Vertex AI (${request.model})...`);

    const sa = decodeCredentials(auth.googleApplicationCredentialsJson!);
    const project = auth.vertexProject || sa.project_id;
    const region = auth.vertexRegion || 'us-central1';

    if (!project) {
      throw new Error(
        'VERTEX_PROJECT not set and could not extract project_id from credentials',
      );
    }

    const accessToken = await getAccessToken(sa);

    const body = {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: { maxOutputTokens: request.maxTokens },
    };

    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${request.model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (data.error) {
      throw new Error(`Vertex AI API error: ${data.error.message}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Vertex AI API returned no content');
    }

    return { content, rawResponse: data };
  }
}

// Exported for testing
export { buildJwt as _buildJwt, decodeCredentials as _decodeCredentials };
