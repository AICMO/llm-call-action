import * as core from '@actions/core';
import { readFile, writeFile, logPromptStats, getEnv } from './utils.js';
import { join } from 'node:path';

export function buildPrompt(): void {
  const prompt = getEnv('INPUT_PROMPT');
  const promptFile = getEnv('INPUT_PROMPT_FILE');
  const data = getEnv('INPUT_DATA');
  const dataFile = getEnv('INPUT_DATA_FILE');
  const workspace = getEnv('GITHUB_WORKSPACE', process.cwd());
  const outputPath = join(workspace, '.llm_user_prompt.txt');

  // Resolve prompt content
  let promptContent: string;
  if (prompt) {
    promptContent = prompt;
    core.info('Using inline prompt');
  } else if (promptFile) {
    promptContent = readFile(promptFile);
    core.info(`Using prompt file: ${promptFile}`);
  } else {
    throw new Error('Either INPUT_PROMPT or INPUT_PROMPT_FILE must be set');
  }

  // Append data if provided (inline takes priority over file)
  if (data) {
    promptContent += '\n---\nData:\n' + data;
    core.info('Appended inline data');
  } else if (dataFile) {
    const dataContent = readFile(dataFile);
    promptContent += '\n---\nData:\n' + dataContent;
    core.info(`Appended data from: ${dataFile}`);
  }

  // Write assembled prompt
  writeFile(outputPath, promptContent);
  core.info(`Prompt saved to ${outputPath}`);

  // Log stats
  logPromptStats(promptContent);
}

function run(): void {
  try {
    buildPrompt();
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
