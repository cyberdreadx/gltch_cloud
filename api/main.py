"""
GLTCH Cloud API - Main Application
FastAPI backend for GLTCH Cloud SaaS
"""
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import uuid

from config import get_settings
from auth import get_auth_dependency
from models import LLMProvider, KeyMode, SubscriptionTier
from llm import route_chat, FREE_TIER_MODEL
from billing import calculate_cost, get_tier_limits, create_customer, create_checkout_session

settings = get_settings()

app = FastAPI(
    title="GLTCH Cloud API",
    description="Backend API for GLTCH Cloud SaaS",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with database in production)
users_db = {}
sessions_db = {}
messages_db = {}


# ============ Pydantic Models ============

class UserCreate(BaseModel):
    callsign: str
    email: str
    provider: LLMProvider = LLMProvider.OPENAI
    key_mode: KeyMode = KeyMode.MANAGED


class UserSettings(BaseModel):
    provider: Optional[LLMProvider] = None
    key_mode: Optional[KeyMode] = None
    openai_key: Optional[str] = None
    anthropic_key: Optional[str] = None
    google_key: Optional[str] = None
    xai_key: Optional[str] = None


class ChatMessage(BaseModel):
    content: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    content: str
    session_id: str
    input_tokens: int
    output_tokens: int
    cost_usd: float


# ============ Auth Endpoints ============

@app.post("/api/auth/register")
async def register(user_data: UserCreate, current_user: dict = Depends(get_auth_dependency())):
    """Register a new user after Clerk signup"""
    user_id = current_user["user_id"]
    
    if user_id in users_db:
        return {"message": "User already exists", "user": users_db[user_id]}
    
    # Create user record
    user = {
        "id": user_id,
        "email": user_data.email,
        "callsign": user_data.callsign,
        "tier": SubscriptionTier.FREE,
        "provider": user_data.provider,
        "key_mode": user_data.key_mode,
        "messages_today": 0,
        "tokens_this_month": 0,
        "last_message_date": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    users_db[user_id] = user
    
    # Create Stripe customer
    stripe_customer_id = await create_customer(user_data.email, user_data.callsign)
    if stripe_customer_id:
        user["stripe_customer_id"] = stripe_customer_id
    
    return {"message": "User registered", "user": user}


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_auth_dependency())):
    """Get current user profile"""
    user_id = current_user["user_id"]
    
    if user_id not in users_db:
        # Auto-create user for dev mode
        users_db[user_id] = {
            "id": user_id,
            "email": current_user.get("email", "user@gltch.app"),
            "callsign": "Operator",
            "tier": SubscriptionTier.FREE,
            "provider": LLMProvider.OPENAI,
            "key_mode": KeyMode.MANAGED,
            "messages_today": 0,
            "tokens_this_month": 0,
            "last_message_date": None,
            "created_at": datetime.utcnow().isoformat()
        }
    
    return users_db[user_id]


@app.patch("/api/auth/settings")
async def update_settings(
    user_settings: UserSettings,
    current_user: dict = Depends(get_auth_dependency())
):
    """Update user settings"""
    user_id = current_user["user_id"]
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_db[user_id]
    
    if user_settings.provider:
        user["provider"] = user_settings.provider
    if user_settings.key_mode:
        user["key_mode"] = user_settings.key_mode
    if user_settings.openai_key:
        user["openai_key"] = user_settings.openai_key
    if user_settings.anthropic_key:
        user["anthropic_key"] = user_settings.anthropic_key
    if user_settings.google_key:
        user["google_key"] = user_settings.google_key
    if user_settings.xai_key:
        user["xai_key"] = user_settings.xai_key
    
    return {"message": "Settings updated", "user": user}


# ============ Chat Endpoints ============

@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    current_user: dict = Depends(get_auth_dependency())
):
    """Send a chat message to GLTCH"""
    user_id = current_user["user_id"]
    
    # Get or create user
    if user_id not in users_db:
        users_db[user_id] = {
            "id": user_id,
            "email": current_user.get("email", "user@gltch.app"),
            "callsign": "Operator",
            "tier": SubscriptionTier.FREE,
            "provider": LLMProvider.OPENAI,
            "key_mode": KeyMode.MANAGED,
            "messages_today": 0,
            "tokens_this_month": 0,
            "last_message_date": None,
            "created_at": datetime.utcnow().isoformat()
        }
    
    user = users_db[user_id]
    tier = user["tier"]
    limits = get_tier_limits(tier)
    
    # Check daily message limit for free tier
    today = date.today().isoformat()
    if user.get("last_message_date") != today:
        user["messages_today"] = 0
        user["last_message_date"] = today
    
    if limits["messages_per_day"] != -1 and user["messages_today"] >= limits["messages_per_day"]:
        raise HTTPException(
            status_code=429,
            detail=f"Daily message limit reached ({limits['messages_per_day']}). Upgrade to Pro for unlimited."
        )
    
    # Get or create session
    session_id = message.session_id or str(uuid.uuid4())
    if session_id not in sessions_db:
        sessions_db[session_id] = {
            "id": session_id,
            "user_id": user_id,
            "title": "New Chat",
            "created_at": datetime.utcnow().isoformat()
        }
        messages_db[session_id] = []
    
    # Get message history
    history = messages_db.get(session_id, [])
    
    # Format messages for LLM
    llm_messages = [{"role": m["role"], "content": m["content"]} for m in history[-10:]]  # Last 10 messages
    llm_messages.append({"role": "user", "content": message.content})
    
    # Determine provider and model
    provider = user.get("provider", LLMProvider.OPENAI)
    model = None
    api_key = None
    
    # Free tier restrictions
    if tier == SubscriptionTier.FREE:
        provider = LLMProvider.OPENAI
        model = FREE_TIER_MODEL
    elif user.get("key_mode") == KeyMode.BYOK:
        # Use user's own API key
        key_map = {
            LLMProvider.OPENAI: user.get("openai_key"),
            LLMProvider.ANTHROPIC: user.get("anthropic_key"),
            LLMProvider.GEMINI: user.get("google_key"),
            LLMProvider.GROK: user.get("xai_key"),
        }
        api_key = key_map.get(provider)
    
    # Call LLM
    result = await route_chat(
        provider=provider,
        messages=llm_messages,
        api_key=api_key,
        model=model
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # Store messages
    messages_db[session_id].append({"role": "user", "content": message.content, "timestamp": datetime.utcnow().isoformat()})
    messages_db[session_id].append({"role": "assistant", "content": result["content"], "timestamp": datetime.utcnow().isoformat()})
    
    # Update usage
    user["messages_today"] += 1
    user["tokens_this_month"] += result["input_tokens"] + result["output_tokens"]
    
    # Calculate cost
    cost = calculate_cost(
        provider.value,
        result.get("model", "gpt-4o"),
        result["input_tokens"],
        result["output_tokens"]
    )
    
    return ChatResponse(
        content=result["content"],
        session_id=session_id,
        input_tokens=result["input_tokens"],
        output_tokens=result["output_tokens"],
        cost_usd=cost
    )


@app.get("/api/sessions")
async def get_sessions(current_user: dict = Depends(get_auth_dependency())):
    """Get user's chat sessions"""
    user_id = current_user["user_id"]
    user_sessions = [s for s in sessions_db.values() if s["user_id"] == user_id]
    return {"sessions": user_sessions}


@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_auth_dependency())
):
    """Get messages for a session"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions_db[session_id]
    if session["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"messages": messages_db.get(session_id, [])}


# ============ Billing Endpoints ============

@app.get("/api/billing/usage")
async def get_usage(current_user: dict = Depends(get_auth_dependency())):
    """Get current usage stats"""
    user_id = current_user["user_id"]
    user = users_db.get(user_id, {})
    
    return {
        "tier": user.get("tier", SubscriptionTier.FREE),
        "messages_today": user.get("messages_today", 0),
        "tokens_this_month": user.get("tokens_this_month", 0),
        "limits": get_tier_limits(user.get("tier", SubscriptionTier.FREE))
    }


@app.post("/api/billing/upgrade")
async def upgrade_to_pro(current_user: dict = Depends(get_auth_dependency())):
    """Get Stripe checkout URL for Pro upgrade"""
    user_id = current_user["user_id"]
    user = users_db.get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("tier") == SubscriptionTier.PRO:
        return {"message": "Already on Pro plan"}
    
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer_id = await create_customer(user["email"], user["callsign"])
        user["stripe_customer_id"] = customer_id
    
    checkout_url = await create_checkout_session(
        customer_id,
        success_url=f"{settings.frontend_url}/app.html?upgrade=success",
        cancel_url=f"{settings.frontend_url}/app.html?upgrade=cancelled"
    )
    
    return {"checkout_url": checkout_url}


@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    import stripe
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Handle subscription events
    if event["type"] == "customer.subscription.created":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        
        # Find user by customer ID and upgrade them
        for user in users_db.values():
            if user.get("stripe_customer_id") == customer_id:
                user["tier"] = SubscriptionTier.PRO
                user["stripe_subscription_id"] = subscription["id"]
                break
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        
        # Downgrade user
        for user in users_db.values():
            if user.get("stripe_customer_id") == customer_id:
                user["tier"] = SubscriptionTier.FREE
                user["stripe_subscription_id"] = None
                break
    
    return {"received": True}


# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
