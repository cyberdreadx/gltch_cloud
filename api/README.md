# GLTCH Cloud API

FastAPI backend for GLTCH Cloud SaaS platform.

## Setup

```bash
cd api
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file:
```
# Auth (Clerk)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...

# Database
DATABASE_URL=postgresql://...
```

## Run

```bash
uvicorn main:app --reload --port 8000
```
