import * as core from '@actions/core';
import { readFile, writeFile, getEnv } from './utils.js';
import { existsSync } from 'node:fs';

const ERROR_PATTERNS =
  /outside the allowed working directory|cannot be accessed|I cannot|I'm unable to|error occurred|ENOENT|No such file/i;

export function stripCodeFences(content: string): string {
  return content
    .split('\n')
    .filter((line) => !/^```[a-zA-Z]*$/.test(line) && line !== '```')
    .join('\n');
}

export function detectErrorPatterns(content: string): boolean {
  return ERROR_PATTERNS.test(content);
}

export function extractClaudeExecContent(raw: string): string {
  // Try parsing as JSON array with result entries (claude-code-action format)
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const resultEntry = parsed.find(
        (entry: { type?: string }) => entry.type === 'result',
      );
      if (resultEntry?.result) {
        return resultEntry.result;
      }
    }
  } catch {
    // Not JSON — use raw content
  }
  return raw;
}

function run(): void {
  try {
    const outputFile = getEnv('INPUT_OUTPUT_FILE', '/tmp/llm_response.txt');
    const cleanResponse = getEnv('INPUT_CLEAN_RESPONSE', 'true') === 'true';
    const minLength = parseInt(getEnv('INPUT_MIN_RESPONSE_LENGTH', '50'), 10);
    const claudeExecFile = getEnv('LLM_RESPONSE_CLAUDE_EXEC_FILE');
    const apiResponseFile = '/tmp/llm_raw.txt';

    let content: string;

    // Priority 1: Claude Code execution file
    if (claudeExecFile && existsSync(claudeExecFile)) {
      core.info(`Reading from Claude execution file: ${claudeExecFile}`);
      const raw = readFile(claudeExecFile);
      content = extractClaudeExecContent(raw);
    }
    // Priority 2: API response file
    else if (existsSync(apiResponseFile)) {
      core.info(`Reading from API response file: ${apiResponseFile}`);
      content = readFile(apiResponseFile);
    } else {
      throw new Error(
        'No input source available (LLM_RESPONSE_CLAUDE_EXEC_FILE or /tmp/llm_raw.txt)',
      );
    }

    if (!content.trim()) {
      throw new Error('Empty content from LLM response');
    }

    if (cleanResponse) {
      // Strip code fences
      content = stripCodeFences(content);

      // Detect error patterns
      if (detectErrorPatterns(content)) {
        const preview = content.split('\n').slice(0, 5).join('\n');
        throw new Error(`LLM response looks like an error, not valid content:\n${preview}`);
      }

      // Write output
      writeFile(outputFile, content);

      // Validate length
      const contentLength = content.trim().length;
      if (contentLength < minLength) {
        throw new Error(
          `Empty or too short response from LLM (${contentLength} chars, minimum ${minLength})`,
        );
      }
    } else {
      core.info('clean_response is disabled — writing raw output');
      writeFile(outputFile, content);
    }

    // Log preview
    const previewLines = content.split('\n').slice(0, 20).join('\n');
    core.info(`=== Generated content (first 20 lines) ===`);
    core.info(previewLines);
    core.info(`=== Content length: ${content.trim().length} chars ===`);

    // Set outputs
    core.setOutput('response', content);
    core.setOutput('response_file', outputFile);
    core.info(`Output saved to ${outputFile}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
