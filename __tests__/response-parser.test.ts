import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const { mockInfo, mockSetFailed, mockSetOutput } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockSetFailed: vi.fn(),
  mockSetOutput: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  info: (...args: unknown[]) => mockInfo(...args),
  debug: vi.fn(),
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
  setOutput: (...args: unknown[]) => mockSetOutput(...args),
}));

import {
  stripCodeFences,
  detectErrorPatterns,
  extractClaudeExecContent,
} from '../src/response-parser.js';

const workspace = join(__dirname, '..', '__test_workspace__');
const rawFile = '/tmp/llm_raw.txt';

function cleanupFiles(...paths: string[]): void {
  for (const p of paths) {
    if (existsSync(p)) unlinkSync(p);
  }
}

async function runResponseParser(): Promise<void> {
  vi.resetModules();
  vi.mock('@actions/core', () => ({
    info: (...args: unknown[]) => mockInfo(...args),
    debug: vi.fn(),
    setFailed: (...args: unknown[]) => mockSetFailed(...args),
    setOutput: (...args: unknown[]) => mockSetOutput(...args),
  }));
  await import('../src/response-parser.js');
}

describe('stripCodeFences', () => {
  it('removes opening and closing code fences', () => {
    const input = '```markdown\nHello world\n```';
    expect(stripCodeFences(input)).toBe('Hello world');
  });

  it('removes plain code fences', () => {
    const input = '```\nsome content\n```';
    expect(stripCodeFences(input)).toBe('some content');
  });

  it('preserves content without fences', () => {
    const input = 'No fences here\nJust plain text';
    expect(stripCodeFences(input)).toBe('No fences here\nJust plain text');
  });

  it('handles multiple fence blocks', () => {
    const input = '```json\n{}\n```\ntext\n```yaml\nkey: val\n```';
    expect(stripCodeFences(input)).toBe('{}\ntext\nkey: val');
  });
});

describe('detectErrorPatterns', () => {
  it('detects "I cannot" pattern', () => {
    expect(detectErrorPatterns('I cannot access that file')).toBe(true);
  });

  it('detects ENOENT pattern', () => {
    expect(detectErrorPatterns('ENOENT: no such file or directory')).toBe(true);
  });

  it('detects "error occurred" pattern', () => {
    expect(detectErrorPatterns('An error occurred while processing')).toBe(true);
  });

  it('returns false for normal content', () => {
    expect(
      detectErrorPatterns(
        'This is a perfectly normal response with substantial content about the topic.',
      ),
    ).toBe(false);
  });
});

describe('extractClaudeExecContent', () => {
  it('extracts result from JSON array', () => {
    const input = JSON.stringify([
      { type: 'tool_use', tool: 'read' },
      { type: 'result', result: 'The actual output content' },
    ]);
    expect(extractClaudeExecContent(input)).toBe('The actual output content');
  });

  it('returns raw content when not JSON', () => {
    expect(extractClaudeExecContent('plain text content')).toBe('plain text content');
  });

  it('returns raw content when JSON has no result', () => {
    const input = JSON.stringify([{ type: 'tool_use', tool: 'read' }]);
    expect(extractClaudeExecContent(input)).toBe(input);
  });
});

describe('response-parser (integration)', () => {
  const outputFile = join(workspace, 'output.txt');

  beforeEach(() => {
    mockInfo.mockClear();
    mockSetFailed.mockClear();
    mockSetOutput.mockClear();
    delete process.env['INPUT_OUTPUT_FILE'];
    delete process.env['INPUT_CLEAN_RESPONSE'];
    delete process.env['INPUT_MIN_RESPONSE_LENGTH'];
    delete process.env['LLM_RESPONSE_CLAUDE_EXEC_FILE'];
    mkdirSync(workspace, { recursive: true });
  });

  afterEach(() => {
    cleanupFiles(outputFile, rawFile);
  });

  it('reads from API response file and writes output', async () => {
    const content =
      'This is a valid LLM response with enough content to pass the minimum length validation check.';
    writeFileSync(rawFile, content);
    process.env['INPUT_OUTPUT_FILE'] = outputFile;

    await runResponseParser();

    expect(mockSetFailed).not.toHaveBeenCalled();
    expect(readFileSync(outputFile, 'utf-8')).toBe(content);
    expect(mockSetOutput).toHaveBeenCalledWith('response', content);
    expect(mockSetOutput).toHaveBeenCalledWith('response_file', outputFile);
  });

  it('strips code fences from response', async () => {
    writeFileSync(rawFile, '```markdown\nValid content that is long enough to pass the minimum.\n```');
    process.env['INPUT_OUTPUT_FILE'] = outputFile;
    process.env['INPUT_MIN_RESPONSE_LENGTH'] = '10';

    await runResponseParser();

    expect(mockSetFailed).not.toHaveBeenCalled();
    const output = readFileSync(outputFile, 'utf-8');
    expect(output).not.toContain('```');
    expect(output).toContain('Valid content');
  });

  it('fails on error pattern in response', async () => {
    writeFileSync(rawFile, 'I cannot access that file outside the allowed working directory');
    process.env['INPUT_OUTPUT_FILE'] = outputFile;

    await runResponseParser();

    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining('looks like an error'),
    );
  });

  it('fails on too short response', async () => {
    writeFileSync(rawFile, 'Short');
    process.env['INPUT_OUTPUT_FILE'] = outputFile;
    process.env['INPUT_MIN_RESPONSE_LENGTH'] = '50';

    await runResponseParser();

    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('too short'));
  });

  it('fails when no input source available', async () => {
    cleanupFiles(rawFile);
    process.env['INPUT_OUTPUT_FILE'] = outputFile;

    await runResponseParser();

    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining('No input source'),
    );
  });

  it('reads from Claude exec file when available', async () => {
    const execFile = join(workspace, 'claude-exec.json');
    const execContent = JSON.stringify([
      { type: 'result', result: 'Extracted result content that is long enough to pass the minimum length check.' },
    ]);
    writeFileSync(execFile, execContent);
    process.env['LLM_RESPONSE_CLAUDE_EXEC_FILE'] = execFile;
    process.env['INPUT_OUTPUT_FILE'] = outputFile;

    await runResponseParser();

    expect(mockSetFailed).not.toHaveBeenCalled();
    const output = readFileSync(outputFile, 'utf-8');
    expect(output).toContain('Extracted result content');

    cleanupFiles(execFile);
  });

  it('respects custom min_response_length', async () => {
    writeFileSync(rawFile, 'This is twenty chars!');
    process.env['INPUT_OUTPUT_FILE'] = outputFile;
    process.env['INPUT_MIN_RESPONSE_LENGTH'] = '10';

    await runResponseParser();

    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  describe('clean_response: false', () => {
    it('skips fence stripping', async () => {
      const content = '```json\n{"key": "value"}\n```';
      writeFileSync(rawFile, content);
      process.env['INPUT_OUTPUT_FILE'] = outputFile;
      process.env['INPUT_CLEAN_RESPONSE'] = 'false';

      await runResponseParser();

      expect(mockSetFailed).not.toHaveBeenCalled();
      const output = readFileSync(outputFile, 'utf-8');
      expect(output).toBe(content);
    });

    it('skips error pattern detection', async () => {
      const content = 'I cannot stress enough how important this analysis is for the team.';
      writeFileSync(rawFile, content);
      process.env['INPUT_OUTPUT_FILE'] = outputFile;
      process.env['INPUT_CLEAN_RESPONSE'] = 'false';

      await runResponseParser();

      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(readFileSync(outputFile, 'utf-8')).toBe(content);
    });

    it('skips min length validation', async () => {
      writeFileSync(rawFile, 'Short');
      process.env['INPUT_OUTPUT_FILE'] = outputFile;
      process.env['INPUT_CLEAN_RESPONSE'] = 'false';
      process.env['INPUT_MIN_RESPONSE_LENGTH'] = '50';

      await runResponseParser();

      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('still fails on empty content', async () => {
      writeFileSync(rawFile, '   ');
      process.env['INPUT_OUTPUT_FILE'] = outputFile;
      process.env['INPUT_CLEAN_RESPONSE'] = 'false';

      await runResponseParser();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Empty content'),
      );
    });

    it('still sets outputs', async () => {
      const content = 'Raw output here';
      writeFileSync(rawFile, content);
      process.env['INPUT_OUTPUT_FILE'] = outputFile;
      process.env['INPUT_CLEAN_RESPONSE'] = 'false';

      await runResponseParser();

      expect(mockSetOutput).toHaveBeenCalledWith('response', content);
      expect(mockSetOutput).toHaveBeenCalledWith('response_file', outputFile);
    });
  });
});
