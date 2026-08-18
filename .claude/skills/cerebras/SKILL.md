---
name: Cerebras Inference
description: Use this to write code to call an LLM using LiteLLM and OpenRouter with Cerebras inference provider.
---

# Calling an LLM via Cerebras

These instructions allow you write code to call an LLM with Cerebras specified as the inference provider.  
This method uses LiteLLM and OpenRouter.

## Setup

The OPENROUTER_API_KEY must be set in the .env file and loaded in as an environment variable.  

The uv project must include litellm and pydantic.
`uv add litellm pydantic`

## Code snippets

Use code like these examples in order to use Cerebras.

### Imports and constants

```python
from litellm import completion
MODEL = "openrouter/openai/gpt-oss-120b"
# allow_fallbacks: False is required -- `order` alone is only a preference,
# and OpenRouter will otherwise silently fall back to a different provider
# hosting the same model once Cerebras is briefly unavailable, rather than
# erroring, which defeats requiring Cerebras as the inference provider.
EXTRA_BODY = {"provider": {"order": ["cerebras"], "allow_fallbacks": False}}
```

### Code to call via Cerebras for a text response

```python
response = completion(model=MODEL, messages=messages, reasoning_effort="low", extra_body=EXTRA_BODY)
result = response.choices[0].message.content
```

### Code to call via Cerebras for a Structured Outputs response

```python
response = completion(model=MODEL, messages=messages, response_format=MyBaseModelSubclass, reasoning_effort="low", extra_body=EXTRA_BODY)
result = response.choices[0].message.content
result_as_object = MyBaseModelSubclass.model_validate_json(result)
```