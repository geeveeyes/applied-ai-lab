# Architecture

```text
Browser UI
  |
  v
Python local server
  |
  +-- Tool runner
  |     +-- priority_scorer
  |
  +-- Provider abstraction
        +-- MockProvider
        +-- OpenAIProvider
        +-- AnthropicProvider
```

## Flow

1. The user enters a goal, decision, or messy situation.
2. The server runs deterministic local tools first.
3. Tool outputs are sent to the selected model provider.
4. The provider is asked to return one structured JSON object.
5. The server validates and normalizes the result.
6. The UI renders sections from the structured output.

## Why Tools Run Before The Model

The first version keeps the agent loop simple. Instead of asking the model to decide when to call a tool, the app runs a known useful tool for every request. This makes behavior easier to demo and evaluate in a 3-6 hour project.

A later version can add model-selected tool calls:

```text
model decides tool -> server executes tool -> model synthesizes final answer
```

## Provider Boundary

All providers implement:

```python
complete(prompt: str, context: dict) -> dict
```

The rest of the app does not need to know which model vendor is used.

## Structured Output Contract

Every provider returns:

```json
{
  "summary": "string",
  "priorities": [{"title": "string", "why": "string", "score": 1}],
  "risks": [{"risk": "string", "mitigation": "string"}],
  "next_actions": [{"action": "string", "timebox": "string"}],
  "questions": ["string"],
  "confidence": 0.0,
  "tool_results": {}
}
```

## Extension Ideas

- Add personal context from a local `profile.md`.
- Add memory in a local JSONL file.
- Add model-selected tool calling.
- Add web research as a separate researcher step.
- Add eval scoring with a second model.
- Deploy the UI as a private demo.
