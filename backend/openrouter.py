"""OpenRouter API client for making LLM requests."""

import asyncio
import httpx
from typing import List, Dict, Any, Optional
from .config import get_openrouter_api_key, OPENROUTER_API_URL

# Retry configuration
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 2.0  # seconds


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API with retry logic for rate limits.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content', optional 'reasoning_details', and 'error' if failed
    """
    api_key = get_openrouter_api_key()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json=payload
                )

                # Handle rate limiting with retry
                if response.status_code == 429:
                    retry_delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                    print(f"Rate limited on {model}, retrying in {retry_delay}s (attempt {attempt + 1}/{MAX_RETRIES})")
                    last_error = "rate_limited"
                    await asyncio.sleep(retry_delay)
                    continue

                # Handle other client errors without retry
                if response.status_code == 400:
                    error_detail = "bad_request"
                    try:
                        error_data = response.json()
                        error_detail = error_data.get("error", {}).get("message", "bad_request")
                    except:
                        pass
                    print(f"Bad request for {model}: {error_detail}")
                    return {
                        'content': None,
                        'error': 'bad_request',
                        'error_message': f"Model returned error: {error_detail}"
                    }

                response.raise_for_status()

                data = response.json()
                message = data['choices'][0]['message']

                return {
                    'content': message.get('content'),
                    'reasoning_details': message.get('reasoning_details'),
                    'error': None
                }

        except httpx.HTTPStatusError as e:
            print(f"HTTP error querying model {model}: {e}")
            last_error = f"http_{e.response.status_code}"
        except httpx.TimeoutException:
            print(f"Timeout querying model {model}")
            last_error = "timeout"
        except Exception as e:
            print(f"Error querying model {model}: {e}")
            last_error = str(e)
            break  # Don't retry on unknown errors

    # All retries exhausted or non-retryable error
    error_messages = {
        "rate_limited": "Rate limited - too many requests",
        "timeout": "Request timed out",
    }
    return {
        'content': None,
        'error': last_error,
        'error_message': error_messages.get(last_error, f"Error: {last_error}")
    }


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio

    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}
