import * as core from '@actions/core';
import type { LlmProvider, LlmRequest, LlmResponse, ProviderAuth } from './types.js';

export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';

  validateAuth(auth: ProviderAuth): void {
    if (!auth.apiKey) {
      throw new Error('OPENAI_API_KEY is required for the OpenAI provider');
    }
  }

  async call(request: LlmRequest, auth: ProviderAuth): Promise<LlmResponse> {
    this.validateAuth(auth);
    core.info(`Calling OpenAI (${request.model})...`);

    const body = {
      model: request.model,
      max_tokens: request.maxTokens,
      messages: [{ role: 'user', content: request.prompt }],
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned no content');
    }

    return { content, rawResponse: data };
  }
}
