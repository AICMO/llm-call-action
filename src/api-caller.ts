import * as core from '@actions/core';
import { readFile, writeFile, getEnv } from './utils.js';
import { join } from 'node:path';
import { resolveProvider } from './providers/index.js';
import { DEFAULT_MODELS } from './providers/types.js';
import type { ProviderAuth, ProviderName } from './providers/types.js';

async function run(): Promise<void> {
  try {
    const providerName = getEnv('INPUT_PROVIDER', 'claude');
    const model = getEnv('INPUT_MODEL') || DEFAULT_MODELS[providerName as ProviderName];
    const maxTokens = parseInt(getEnv('INPUT_MAX_TOKENS', '4096'), 10);
    const workspace = getEnv('GITHUB_WORKSPACE', process.cwd());
    const promptPath = join(workspace, '.llm_user_prompt.txt');

    if (!model) {
      throw new Error(`No model specified and no default for provider: ${providerName}`);
    }

    const prompt = readFile(promptPath);
    core.info(`Prompt loaded (${prompt.length} chars)`);

    const provider = resolveProvider(providerName);

    const auth: ProviderAuth = {
      apiKey:
        getEnv('INPUT_ANTHROPIC_API_KEY') ||
        getEnv('INPUT_OPENAI_API_KEY') ||
        getEnv('INPUT_GOOGLE_API_KEY'),
      googleApplicationCredentialsJson: getEnv('INPUT_GOOGLE_APPLICATION_CREDENTIALS_JSON'),
      vertexProject: getEnv('INPUT_VERTEX_PROJECT'),
      vertexRegion: getEnv('INPUT_VERTEX_REGION', 'us-central1'),
    };

    const result = await provider.call({ prompt, model, maxTokens }, auth);

    // Write raw response for response-parser
    writeFile('/tmp/llm_raw.txt', result.content);
    core.info(`Raw response written to /tmp/llm_raw.txt (${result.content.length} chars)`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
