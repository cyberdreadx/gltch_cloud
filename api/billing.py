"""
GLTCH Cloud API - Stripe Billing Service
"""
import stripe
from config import get_settings
from models import SubscriptionTier

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


# Pricing (cost per 1K tokens)
PROVIDER_PRICING = {
    "openai": {
        "gpt-4o": {"input": 0.015, "output": 0.045},
        "gpt-4o-mini": {"input": 0.0005, "output": 0.0015},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    },
    "anthropic": {
        "claude-3-5-sonnet": {"input": 0.003, "output": 0.015},
        "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
    },
    "gemini": {
        "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
        "gemini-1.5-flash": {"input": 0.000075, "output": 0.0003},
    },
    "grok": {
        "grok-2": {"input": 0.002, "output": 0.01},
    }
}


def calculate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for token usage"""
    pricing = PROVIDER_PRICING.get(provider, {}).get(model)
    if not pricing:
        # Default pricing if model not found
        pricing = {"input": 0.01, "output": 0.03}
    
    input_cost = (input_tokens / 1000) * pricing["input"]
    output_cost = (output_tokens / 1000) * pricing["output"]
    return round(input_cost + output_cost, 6)


async def create_customer(email: str, name: str) -> str:
    """Create a Stripe customer"""
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"source": "gltch_cloud"}
        )
        return customer.id
    except Exception as e:
        print(f"Error creating Stripe customer: {e}")
        return None


async def create_subscription(customer_id: str, price_id: str = None) -> dict:
    """Create a Pro subscription"""
    try:
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id or settings.stripe_price_pro}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        return {
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret,
            "status": subscription.status
        }
    except Exception as e:
        print(f"Error creating subscription: {e}")
        return None


async def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription"""
    try:
        stripe.Subscription.delete(subscription_id)
        return True
    except Exception as e:
        print(f"Error canceling subscription: {e}")
        return False


async def get_subscription_status(subscription_id: str) -> dict:
    """Get subscription status"""
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return {
            "status": subscription.status,
            "current_period_end": subscription.current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end
        }
    except Exception as e:
        print(f"Error getting subscription: {e}")
        return None


async def record_usage(customer_id: str, quantity: int, timestamp: int = None):
    """Record metered usage for billing"""
    # This would be used for usage-based billing on top of the subscription
    # For now, we track internally and bill monthly
    pass


async def create_checkout_session(customer_id: str, success_url: str, cancel_url: str) -> str:
    """Create a Stripe Checkout session for Pro upgrade"""
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": settings.stripe_price_pro, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return session.url
    except Exception as e:
        print(f"Error creating checkout session: {e}")
        return None


def get_tier_limits(tier: SubscriptionTier) -> dict:
    """Get usage limits for a subscription tier"""
    if tier == SubscriptionTier.PRO:
        return {
            "messages_per_day": -1,  # Unlimited
            "providers": ["openai", "anthropic", "gemini", "grok"],
            "features": ["browser", "telegram", "all_modes"]
        }
    else:  # FREE
        return {
            "messages_per_day": 25,
            "providers": ["openai"],  # GPT-3.5 only
            "features": ["basic_modes"]
        }
