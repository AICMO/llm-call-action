import * as core from '@actions/core';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function readFile(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  return readFileSync(path, 'utf-8');
}

export function writeFile(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8');
}

export function logPromptStats(content: string): void {
  const chars = content.length;
  const words = content.split(/\s+/).filter(Boolean).length;
  const lines = content.split('\n').length;

  core.info(`=== Prompt Stats ===`);
  core.info(`Characters: ${chars} | Words: ${words} | Lines: ${lines}`);

  const contentLines = content.split('\n');
  core.info('--- HEAD (2 lines) ---');
  core.info(contentLines.slice(0, 2).join('\n'));
  core.info('...');
  core.info('--- TAIL (2 lines) ---');
  core.info(contentLines.slice(-2).join('\n'));
  core.info('======================');
}

export function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}
