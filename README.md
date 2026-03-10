# LLM Call Action

**prompt + data → LLM → parsed output**

A reusable composite GitHub Action that takes a prompt template and data file, calls an LLM, and returns cleaned output. Single bundled TypeScript runtime — no external dependencies at execution time.

## Quick Start

The fastest way to get started — use your personal Claude Code OAuth token:

```yaml
- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/summarize.md
    data_file: /tmp/input-data.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

- run: cat /tmp/llm_response.txt
```

No API keys, no billing setup, no provider configuration. Just your personal token and a prompt. If the token is unavailable or you need a different provider, the action automatically falls back to a configured API key — just add one as an optional safety net.

### How to get your Claude Code OAuth token

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
2. Run `claude setup-token` — it will open a browser, authenticate, and print a long-lived token
3. Copy the token and add it as a repository secret: **Settings → Secrets → New repository secret** → name it `CLAUDE_CODE_OAUTH_TOKEN`

> **Usage policy:** Personal Claude Code tokens are tied to your individual Anthropic account. Anthropic's Terms of Service permit personal use. Business or commercial use may require a separate arrangement — it is your responsibility to ensure compliance with Anthropic's current terms. This project does not grant any license to use Anthropic's services.

## Why this action?

Most CI/AI actions are either **vendor-locked agents** that own the whole workflow (PR comments, commits, code review) for a single provider, or **thin API wrappers** that hand you raw JSON and leave the rest to you.

This action is neither. It's a **composable pipeline primitive** — the `curl` of LLM workflows:

- **You** control the prompt (inline text or template file).
- **You** control the data (any file piped through `data_file`).
- **You** decide what to do with the output (write to file, post a comment, feed into the next step).

The action handles the undifferentiated work: provider abstraction, auth routing, code-fence stripping, error detection, and response validation. You chain the steps.

| | Vendor agents | Generic wrappers | **LLM Call Action** |
|-|--------------|-----------------|-------------------|
| Multi-provider | No (1 vendor) | Yes | Yes (4 providers) |
| OAuth + API unified | No | No | Yes (auto-routed) |
| Pipeline-oriented | No | No | Yes (`output_file` → next step's `data_file`) |
| Output cleaning | No (raw response) | No (raw response) | Yes (code-fence stripping, error detection) |
| Zero runtime overhead | No (installs deps) | Varies | Yes (single bundled file) |
| Opinionated about workflow | Yes (PR comments, commits) | No | No — you decide |

**Use vendor agents** when you want an AI that reads your repo, writes code, and posts PR comments. **Use this action** when you want a reliable, provider-agnostic building block that fits into any workflow you design.

## Authentication

### Personal Claude Code token (recommended)

Pass your personal OAuth token. Under the hood, this delegates to `anthropics/claude-code-action@v1` — same engine that powers Claude Code CLI.

```yaml
- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/summarize.md
    data_file: /tmp/input-data.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

This is the preferred path: zero API billing, leverages your existing Claude Pro/Team subscription, and supports multi-turn tool use via `max_turns`.

### API key (fallback)

When no OAuth token is provided, the action falls back to a direct API call via `fetch`. Supports 4 providers — pass the corresponding key:

```yaml
# Claude (Anthropic API)
- uses: aicmo/llm-call-action@v1
  with:
    prompt: "Summarize the following data."
    data_file: /tmp/input-data.txt
    provider: claude
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

```yaml
# OpenAI
- uses: aicmo/llm-call-action@v1
  with:
    prompt: "Summarize the following data."
    data_file: /tmp/input-data.txt
    provider: openai
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

```yaml
# Gemini
- uses: aicmo/llm-call-action@v1
  with:
    prompt: "Summarize the following data."
    data_file: /tmp/input-data.txt
    provider: gemini
    google_api_key: ${{ secrets.GOOGLE_API_KEY }}
```

```yaml
# Vertex AI
- uses: aicmo/llm-call-action@v1
  with:
    prompt: "Summarize the following data."
    data_file: /tmp/input-data.txt
    provider: vertex
    google_application_credentials_json: ${{ secrets.GOOGLE_CREDENTIALS_B64 }}
    vertex_project: my-gcp-project
```

## Features

- **2 auth paths** — Personal Claude Code token (recommended) or API key per provider
- **4 API providers** — Claude, OpenAI, Gemini, Vertex AI
- **Inline or file prompts** — pass prompt text directly or reference a template file
- **Response cleaning** — automatic output sanitization (see below)
- **Pipeline-ready** — `output_file` of one step becomes `data_file` of the next
- **Prompt stats** — logs character/word/line counts for debugging

## Response Cleaning

Enabled by default (`clean_response: true`). Set to `false` for raw passthrough.

When enabled, the action applies three cleaning steps to every LLM response before writing it to `output_file`:

1. **Code-fence stripping** — removes opening (`` ```lang ``) and closing (`` ``` ``) fence lines, so you get plain text instead of a markdown code block.
2. **Error detection** — scans the response for known failure patterns and **fails the step** if any match:
   - `I cannot`, `I'm unable to`
   - `ENOENT`, `No such file`
   - `error occurred`
   - `cannot be accessed`
   - `outside the allowed working directory`
3. **Minimum length validation** — fails if the cleaned response is shorter than `min_response_length` characters (default: `50`). Catches empty or stub responses.

If any check fails, the action exits with a non-zero code and logs the first 5 lines of the response as a preview.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `prompt` | No* | — | Inline prompt text |
| `prompt_file` | No* | — | Path to prompt template file |
| `data` | No | — | Inline data text to append to prompt |
| `data_file` | No | — | Path to data file to append to prompt |
| `output_file` | No | `/tmp/llm_response.txt` | Where to write the parsed LLM response |
| `claude_code_oauth_token` | No | — | Personal Claude Code OAuth token (recommended — enables OAuth path) |
| `max_turns` | No | `5` | Max turns for Claude Code OAuth path |
| `claude_tools` | No | — | Restrict available tools for Claude Code OAuth path (e.g., `Read`, `Bash,Edit,Read`). Leave empty for all tools. |
| `provider` | No | `claude` | LLM provider for API path: `claude`, `openai`, `gemini`, `vertex` |
| `model` | No | Per-provider default | Model name (provider-specific) |
| `max_tokens` | No | `4096` | Max tokens for LLM response |
| `clean_response` | No | `true` | Clean the response: strip code fences, detect error patterns, validate min length |
| `min_response_length` | No | `50` | Minimum response length in characters (only when `clean_response` is `true`) |
| `anthropic_api_key` | No | — | Anthropic API key |
| `openai_api_key` | No | — | OpenAI API key |
| `google_api_key` | No | — | Google AI API key (Gemini) |
| `google_application_credentials_json` | No | — | Google service account credentials (base64-encoded, Vertex AI) |
| `vertex_project` | No | — | Google Cloud project for Vertex AI |
| `vertex_region` | No | `us-central1` | Google Cloud region for Vertex AI |

\* Either `prompt` or `prompt_file` must be provided.

### Default Models

| Provider | Default Model |
|----------|---------------|
| `claude` (OAuth) | `claude-sonnet-4-6` |
| `claude` (API) | `claude-sonnet-4-6` |
| `openai` | `gpt-4o` |
| `gemini` | `gemini-2.5-pro` |
| `vertex` | `gemini-2.5-pro` |

## Outputs

| Output | Description |
|--------|-------------|
| `response` | The parsed text response from the LLM |
| `response_file` | Path to the file containing the parsed response |

## Scenarios

### Content Generation

#### Release Notes

```yaml
- run: git log --oneline v1.0.0..HEAD > /tmp/git-log.txt

- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/release-notes.md
    data_file: /tmp/git-log.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

#### Documentation Regen

```yaml
- run: cat src/api/*.ts > /tmp/api-source.txt

- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/generate-docs.md
    data_file: /tmp/api-source.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### Code Quality

#### PR Review

```yaml
- run: gh pr diff ${{ github.event.pull_request.number }} > /tmp/pr-diff.txt

- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/pr-review.md
    data_file: /tmp/pr-diff.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### Data Transformation

#### i18n Translation

```yaml
- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/translate-to-es.md
    data_file: locales/en.json
    output_file: locales/es.json
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### Multi-step Pipelines

#### Analyze → Summarize → Recommend

```yaml
- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/analyze.md
    data_file: /tmp/raw-data.txt
    output_file: /tmp/analysis.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/summarize.md
    data_file: /tmp/analysis.txt
    output_file: /tmp/summary.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/recommend.md
    data_file: /tmp/summary.txt
    output_file: /tmp/recommendations.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### Mixed Providers

Nothing stops you from mixing auth paths or providers within the same workflow:

```yaml
# Step 1: Claude via personal token
- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/analyze.md
    data_file: /tmp/raw-data.txt
    output_file: /tmp/analysis.txt
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}

# Step 2: OpenAI via API key
- uses: aicmo/llm-call-action@v1
  with:
    prompt_file: prompts/summarize.md
    data_file: /tmp/analysis.txt
    output_file: /tmp/summary.txt
    provider: openai
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Architecture

### Execution Flow

```
                    ┌─────────────────────┐
                    │  Step 1: Build      │
                    │  prompt-builder.js   │
                    └──────────┬──────────┘
                               │ writes .llm_user_prompt.txt
                               │
                    ┌──────────▼──────────┐
                    │  Step 2: Auth       │
                    │  check (bash)       │
                    └───┬─────────────┬───┘
                        │             │
                 oauth  │             │  api
                        │             │
           ┌────────────▼───┐   ┌─────▼──────────────┐
           │ Step 3a:       │   │ Step 3b:            │
           │ claude-code-   │   │ api-caller.js       │
           │ action@v1      │   │ (fetch → provider)  │
           └──────┬─────────┘   └─────┬──────────────┘
                  │ exec_file         │ /tmp/llm_raw.txt
                  │                   │
                  └─────────┬─────────┘
                            │
                   ┌────────▼─────────┐
                   │ Step 4: Parse    │
                   │ response-parser  │
                   └────────┬─────────┘
                            │
                     sets outputs:
                     • response (text)
                     • response_file (path)
```

Steps 3a and 3b are **mutually exclusive** — the auth check routes to exactly one. Step 4 auto-detects which path ran by checking which file exists on disk.

### Step-by-Step Detail

#### Step 1 — Build Prompt (`dist/prompt-builder.js`)

**Runs:** Always.

Resolves prompt content from one of two sources, optionally appends data, writes the assembled prompt to `$GITHUB_WORKSPACE/.llm_user_prompt.txt`.

| Env var | Source |
|---------|--------|
| `INPUT_PROMPT` | `inputs.prompt` |
| `INPUT_PROMPT_FILE` | `inputs.prompt_file` |
| `INPUT_DATA_FILE` | `inputs.data_file` |
| `GITHUB_WORKSPACE` | Set by GitHub Actions |

**Logic:**
1. If `INPUT_PROMPT` is non-empty → use as prompt content.
2. Else if `INPUT_PROMPT_FILE` is non-empty → read that file.
3. Else → **fail**.
4. If `INPUT_DATA_FILE` is set → read and append with `\n---\nData:\n` delimiter.
5. Write to `.llm_user_prompt.txt`. Log stats (chars, words, lines, head/tail preview).

**Produces:** `$GITHUB_WORKSPACE/.llm_user_prompt.txt`

**Failure cases:**
- Neither `prompt` nor `prompt_file` provided
- Prompt file or data file does not exist

---

#### Step 2 — Auth Check (bash)

**Runs:** Always.

One-liner: if `claude_code_oauth_token` is non-empty, output `method=oauth`; otherwise `method=api`.

**Produces:** `steps.auth.outputs.method` (`"oauth"` or `"api"`)

---

#### Step 3a — OAuth Path (`anthropics/claude-code-action@v1`)

**Runs:** Only when `method == 'oauth'`.

Delegates to the official Claude Code Action using your personal token. Passes a prompt that tells Claude to read `.llm_user_prompt.txt` and respond with raw output only.

| Parameter | Value |
|-----------|-------|
| `claude_code_oauth_token` | From input |
| `prompt` | "Read .llm_user_prompt.txt, respond with ONLY the output" |
| `--model` | `inputs.model` or `claude-sonnet-4-6` |
| `--max-turns` | `inputs.max_turns` or `5` |
| `--tools` | `inputs.claude_tools` (omitted if empty — all tools available) |

**Produces:** `steps.llm_oauth.outputs.execution_file` — a JSON file containing the execution log (array of entries with `type: "result"`).

**Failure:** Inherits from claude-code-action (auth failure, model error, etc.).

---

#### Step 3b — API Path (`dist/api-caller.js`)

**Runs:** Only when `method == 'api'`.

Reads the assembled prompt, resolves the provider, validates auth, and calls the LLM API via native `fetch`.

| Env var | Source |
|---------|--------|
| `INPUT_PROVIDER` | `inputs.provider` (default: `claude`) |
| `INPUT_MODEL` | `inputs.model` (default: per-provider, see table above) |
| `INPUT_MAX_TOKENS` | `inputs.max_tokens` (default: `4096`) |
| `INPUT_ANTHROPIC_API_KEY` | `inputs.anthropic_api_key` |
| `INPUT_OPENAI_API_KEY` | `inputs.openai_api_key` |
| `INPUT_GOOGLE_API_KEY` | `inputs.google_api_key` |
| `INPUT_GOOGLE_APPLICATION_CREDENTIALS_JSON` | `inputs.google_application_credentials_json` |
| `INPUT_VERTEX_PROJECT` | `inputs.vertex_project` |
| `INPUT_VERTEX_REGION` | `inputs.vertex_region` (default: `us-central1`) |

**Provider details:**

| Provider | Endpoint | Auth | Response extraction |
|----------|----------|------|-------------------|
| `claude` | `api.anthropic.com/v1/messages` | `x-api-key` header | `.content[0].text` |
| `openai` | `api.openai.com/v1/chat/completions` | `Bearer` token | `.choices[0].message.content` |
| `gemini` | `generativelanguage.googleapis.com/.../generateContent` | API key as `?key=` query param | `.candidates[0].content.parts[0].text` |
| `vertex` | `{region}-aiplatform.googleapis.com/.../generateContent` | JWT → OAuth2 token exchange → `Bearer` | `.candidates[0].content.parts[0].text` |

**Produces:** `/tmp/llm_raw.txt` (extracted text content from the API response).

**Failure cases:**
- Unknown provider name
- Missing API key / credentials for the selected provider
- API returns an error response (auth failure, rate limit, etc.)
- API returns a response with no extractable content
- Vertex-specific: invalid base64 credentials, missing project, token exchange failure

---

#### Step 4 — Parse Response (`dist/response-parser.js`)

**Runs:** Always (after whichever Step 3 ran).

Reads the raw LLM output, cleans it, validates it, and sets the action's outputs.

| Env var | Source |
|---------|--------|
| `INPUT_OUTPUT_FILE` | `inputs.output_file` (default: `/tmp/llm_response.txt`) |
| `INPUT_CLEAN_RESPONSE` | `inputs.clean_response` (default: `true`) |
| `INPUT_MIN_RESPONSE_LENGTH` | `inputs.min_response_length` (default: `50`) |
| `LLM_RESPONSE_CLAUDE_EXEC_FILE` | `steps.llm_oauth.outputs.execution_file` (empty if API path) |

**Logic:**
1. **Find input** (priority order):
   - If `LLM_RESPONSE_CLAUDE_EXEC_FILE` exists → read it, parse as JSON array, extract the entry where `type === "result"` → use `.result`.
   - Else if `/tmp/llm_raw.txt` exists → read it directly.
   - Else → **fail**: no input source.
2. If empty or whitespace-only → **fail**.
3. If `clean_response` is `true` (default):
   - **Strip code fences** — remove lines matching `` ```language `` or `` ``` ``.
   - **Error detection** — regex scan for patterns: `I cannot`, `I'm unable to`, `ENOENT`, `No such file`, `error occurred`, `cannot be accessed`, `outside the allowed working directory`. If matched → **fail** with the first 5 lines as preview.
   - **Length validation** — if `content.trim().length < min_response_length` → **fail**.
4. If `clean_response` is `false` — write raw content as-is (skip steps above).
5. **Write** content to `INPUT_OUTPUT_FILE`.
6. **Set outputs**: `response` (text) and `response_file` (path to the written file).

**Produces:**
- File at `output_file` path
- Action output `response` (text)
- Action output `response_file` (path)

**Failure cases (always):**
- No input source (neither Claude exec file nor `/tmp/llm_raw.txt` exists)
- Empty content from LLM

**Failure cases (only when `clean_response: true`):**
- Error pattern detected in the response
- Response shorter than `min_response_length` characters

## Development

```bash
npm install
npm run build      # Rollup → 3 dist/*.js files
npm test           # Vitest unit tests
npm run typecheck  # TypeScript type checking
```