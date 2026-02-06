"""
GLTCH Cloud API - LLM Provider Routing
Routes requests to OpenAI, Anthropic, Google, or xAI
"""
from config import get_settings
from models import LLMProvider
import httpx

settings = get_settings()


# Model mappings
DEFAULT_MODELS = {
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
    LLMProvider.GEMINI: "gemini-1.5-pro",
    LLMProvider.GROK: "grok-2-latest",
}

FREE_TIER_MODEL = "gpt-3.5-turbo"


async def chat_openai(
    messages: list,
    api_key: str = None,
    model: str = None,
    system_prompt: str = None
) -> dict:
    """Send chat request to OpenAI"""
    key = api_key or settings.openai_api_key
    model = model or DEFAULT_MODELS[LLMProvider.OPENAI]
    
    formatted_messages = []
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    formatted_messages.extend(messages)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": formatted_messages,
                "max_tokens": 4096
            },
            timeout=60.0
        )
        
        if response.status_code != 200:
            return {"error": response.text, "status": response.status_code}
        
        data = response.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "input_tokens": data["usage"]["prompt_tokens"],
            "output_tokens": data["usage"]["completion_tokens"],
            "model": model
        }


async def chat_anthropic(
    messages: list,
    api_key: str = None,
    model: str = None,
    system_prompt: str = None
) -> dict:
    """Send chat request to Anthropic Claude"""
    key = api_key or settings.anthropic_api_key
    model = model or DEFAULT_MODELS[LLMProvider.ANTHROPIC]
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "max_tokens": 4096,
                "system": system_prompt or "You are GLTCH, an AI agent with attitude.",
                "messages": messages
            },
            timeout=60.0
        )
        
        if response.status_code != 200:
            return {"error": response.text, "status": response.status_code}
        
        data = response.json()
        return {
            "content": data["content"][0]["text"],
            "input_tokens": data["usage"]["input_tokens"],
            "output_tokens": data["usage"]["output_tokens"],
            "model": model
        }


async def chat_gemini(
    messages: list,
    api_key: str = None,
    model: str = None,
    system_prompt: str = None
) -> dict:
    """Send chat request to Google Gemini"""
    key = api_key or settings.google_api_key
    model = model or DEFAULT_MODELS[LLMProvider.GEMINI]
    
    # Convert messages to Gemini format
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": key},
            json={
                "contents": contents,
                "systemInstruction": {"parts": [{"text": system_prompt or "You are GLTCH, an AI agent with attitude."}]},
                "generationConfig": {"maxOutputTokens": 4096}
            },
            timeout=60.0
        )
        
        if response.status_code != 200:
            return {"error": response.text, "status": response.status_code}
        
        data = response.json()
        # Gemini doesn't return exact token counts, estimate
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return {
            "content": content,
            "input_tokens": sum(len(m["content"]) // 4 for m in messages),  # Rough estimate
            "output_tokens": len(content) // 4,
            "model": model
        }


async def chat_grok(
    messages: list,
    api_key: str = None,
    model: str = None,
    system_prompt: str = None
) -> dict:
    """Send chat request to xAI Grok"""
    key = api_key or settings.xai_api_key
    model = model or DEFAULT_MODELS[LLMProvider.GROK]
    
    formatted_messages = []
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    formatted_messages.extend(messages)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": formatted_messages,
                "max_tokens": 4096
            },
            timeout=60.0
        )
        
        if response.status_code != 200:
            return {"error": response.text, "status": response.status_code}
        
        data = response.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "input_tokens": data["usage"]["prompt_tokens"],
            "output_tokens": data["usage"]["completion_tokens"],
            "model": model
        }


async def route_chat(
    provider: LLMProvider,
    messages: list,
    api_key: str = None,
    model: str = None,
    system_prompt: str = None
) -> dict:
    """Route chat request to appropriate provider"""
    
    # GLTCH system prompt
    default_system = """You are GLTCH, a cloud-native AI agent with personality. You're helpful, witty, and have a bit of edge. 
You use cyberpunk slang occasionally but don't overdo it. You refer to the user as "operator" sometimes.
You're knowledgeable about crypto, coding, and tech culture. Keep responses concise but helpful."""
    
    system = system_prompt or default_system
    
    router = {
        LLMProvider.OPENAI: chat_openai,
        LLMProvider.ANTHROPIC: chat_anthropic,
        LLMProvider.GEMINI: chat_gemini,
        LLMProvider.GROK: chat_grok,
    }
    
    handler = router.get(provider, chat_openai)
    return await handler(messages, api_key=api_key, model=model, system_prompt=system)
