import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const mockInfo = vi.fn();
const mockSetFailed = vi.fn();

vi.mock('@actions/core', () => ({
  info: (...args: unknown[]) => mockInfo(...args),
  debug: vi.fn(),
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
  getInput: vi.fn(),
  setOutput: vi.fn(),
}));

const fixturesDir = join(__dirname, '..', '__fixtures__');
const workspace = join(__dirname, '..', '__test_workspace__');

function getOutputContent(): string {
  return readFileSync(join(workspace, '.llm_user_prompt.txt'), 'utf-8');
}

async function runPromptBuilder(): Promise<void> {
  vi.resetModules();
  vi.mock('@actions/core', () => ({
    info: (...args: unknown[]) => mockInfo(...args),
    debug: vi.fn(),
    setFailed: (...args: unknown[]) => mockSetFailed(...args),
    getInput: vi.fn(),
    setOutput: vi.fn(),
  }));
  await import('../src/prompt-builder.js');
}

describe('prompt-builder', () => {
  beforeEach(() => {
    mockInfo.mockClear();
    mockSetFailed.mockClear();
    delete process.env['INPUT_PROMPT'];
    delete process.env['INPUT_PROMPT_FILE'];
    delete process.env['INPUT_DATA'];
    delete process.env['INPUT_DATA_FILE'];
    process.env['GITHUB_WORKSPACE'] = workspace;
    mkdirSync(workspace, { recursive: true });
  });

  afterEach(() => {
    const outputPath = join(workspace, '.llm_user_prompt.txt');
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  });

  it('builds prompt from inline text', async () => {
    process.env['INPUT_PROMPT'] = 'Hello, summarize this for me.';
    await runPromptBuilder();

    const content = getOutputContent();
    expect(content).toBe('Hello, summarize this for me.');
    expect(mockSetFailed).not.toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalledWith('Using inline prompt');
  });

  it('builds prompt from file', async () => {
    process.env['INPUT_PROMPT_FILE'] = join(fixturesDir, 'prompts', 'simple.md');
    await runPromptBuilder();

    const content = getOutputContent();
    expect(content).toContain('You are a helpful assistant');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  it('appends data file content', async () => {
    process.env['INPUT_PROMPT'] = 'Analyze this:';
    process.env['INPUT_DATA_FILE'] = join(fixturesDir, 'prompts', 'simple.md');
    await runPromptBuilder();

    const content = getOutputContent();
    expect(content).toContain('Analyze this:');
    expect(content).toContain('---\nData:\n');
    expect(content).toContain('You are a helpful assistant');
  });

  it('prefers inline prompt over prompt_file', async () => {
    process.env['INPUT_PROMPT'] = 'Inline wins';
    process.env['INPUT_PROMPT_FILE'] = join(fixturesDir, 'prompts', 'simple.md');
    await runPromptBuilder();

    const content = getOutputContent();
    expect(content).toMatch(/^Inline wins/);
  });

  it('fails when neither prompt nor prompt_file set', async () => {
    await runPromptBuilder();
    expect(mockSetFailed).toHaveBeenCalledWith(
      'Either INPUT_PROMPT or INPUT_PROMPT_FILE must be set',
    );
  });

  it('fails when prompt_file does not exist', async () => {
    process.env['INPUT_PROMPT_FILE'] = '/nonexistent/prompt.md';
    await runPromptBuilder();
    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining('File not found'),
    );
  });

  it('fails when data_file does not exist', async () => {
    process.env['INPUT_PROMPT'] = 'Some prompt';
    process.env['INPUT_DATA_FILE'] = '/nonexistent/data.txt';
    await runPromptBuilder();
    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining('File not found'),
    );
  });

  it('appends inline data', async () => {
    process.env['INPUT_PROMPT'] = 'Analyze this:';
    process.env['INPUT_DATA'] = 'Some inline data content';
    await runPromptBuilder();

    const content = getOutputContent();
    expect(content).toContain('Analyze this:');
    expect(content).toContain('---\nData:\n');
    expect(content).toContain('Some inline data content');
    expect(mockInfo).toHaveBeenCalledWith('Appended inline data');
  });

  it('prefers inline data over data_file', async () => {
    process.env['INPUT_PROMPT'] = 'Analyze this:';
    process.env['INPUT_DATA'] = 'Inline data wins';
    process.env['INPUT_DATA_FILE'] = join(fixturesDir, 'prompts', 'simple.md');
    await runPromptBuilder();

    const content = getOutputContent();
    expect(content).toContain('Inline data wins');
    expect(content).not.toContain('You are a helpful assistant');
  });

  it('logs prompt stats', async () => {
    process.env['INPUT_PROMPT'] = 'Hello world\nSecond line\nThird line';
    await runPromptBuilder();

    expect(mockInfo).toHaveBeenCalledWith('=== Prompt Stats ===');
    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringContaining('Characters:'),
    );
  });
});
