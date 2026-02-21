# Inspiration

Curated references for the LLM Pipeline Action. Each entry explains **what pattern to borrow**, not just what the project does.

---

## Tier 1 — Same Patterns (LLM-in-CI Actions)

| Action | Key Patterns |
|--------|-------------|
| [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) | Structured output via `--json-schema`, session resumption, multi-provider auth (OIDC, Bedrock, Vertex, Foundry), sticky comment updates |
| [actions/ai-inference](https://github.com/actions/ai-inference) | GitHub's official AI action. Dual input (`prompt` + `prompt-file`), `.prompt.yml` template format, `response` + `response-file` dual output, MCP integration |
| [openai/codex-action](https://github.com/openai/codex-action) | Sandbox security tiers, `output-schema`/`output-schema-file` for structured output, `allow-users`/`allow-bots` permission lists |
| [appleboy/llm-action](https://github.com/appleboy/llm-action) | `tool_schema` for structured output, token usage outputs, OpenAI-compatible `base_url` for any provider |
| [google-github-actions/run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli) | Composite action with multi-auth validation, artifact upload, error output alongside success |

## Tier 2 — Infrastructure Patterns (Non-LLM)

| Action | Key Pattern |
|--------|------------|
| [actions/checkout](https://github.com/actions/checkout) | Gold standard input/output design, sensible defaults, post-job cleanup |
| [actions/cache](https://github.com/actions/cache) | Sub-action decomposition (main + `/restore` + `/save`) |
| [actions/upload-artifact](https://github.com/actions/upload-artifact) | Configurable failure behavior (`if-no-files-found`: warn/error/ignore) |
| [actions/github-script](https://github.com/actions/github-script) | Programmable escape hatch (inline script input) |
| [actions/setup-node](https://github.com/actions/setup-node) | Version resolution hierarchy, integrated caching |

## Tier 3 — Quality & Evaluation

| Action | Key Pattern |
|--------|------------|
| [promptfoo/promptfoo-action](https://github.com/promptfoo/promptfoo-action) | Threshold-based quality gates, before/after comparison |

## Tier 4 — Ecosystem Context

| Resource | Value |
|----------|-------|
| [githubnext/awesome-continuous-ai](https://github.com/githubnext/awesome-continuous-ai) | Curated list of CI AI actions — positions our action as a **primitive** enabling all categories |
