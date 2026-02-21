import * as core from '@actions/core';
import type { LlmProvider, LlmRequest, LlmResponse, ProviderAuth } from './types.js';

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';

  validateAuth(auth: ProviderAuth): void {
    if (!auth.apiKey) {
      throw new Error('GOOGLE_API_KEY is required for the Gemini provider');
    }
  }

  async call(request: LlmRequest, auth: ProviderAuth): Promise<LlmResponse> {
    this.validateAuth(auth);
    core.info(`Calling Gemini (${request.model})...`);

    const body = {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: { maxOutputTokens: request.maxTokens },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${auth.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Gemini API returned no content');
    }

    return { content, rawResponse: data };
  }
}
