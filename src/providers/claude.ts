import * as core from '@actions/core';
import type { LlmProvider, LlmRequest, LlmResponse, ProviderAuth } from './types.js';

export class ClaudeProvider implements LlmProvider {
  readonly name = 'claude';

  validateAuth(auth: ProviderAuth): void {
    if (!auth.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for the Claude provider');
    }
  }

  async call(request: LlmRequest, auth: ProviderAuth): Promise<LlmResponse> {
    this.validateAuth(auth);
    core.info(`Calling Claude (${request.model})...`);

    const body = {
      model: request.model,
      max_tokens: request.maxTokens,
      messages: [{ role: 'user', content: request.prompt }],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': auth.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (data.error) {
      throw new Error(`Claude API error: ${data.error.message}`);
    }

    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('Claude API returned no content');
    }

    return { content, rawResponse: data };
  }
}
