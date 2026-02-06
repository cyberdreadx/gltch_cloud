# GLTCH Cloud

Cloud-hosted SaaS version of GLTCH AI Agent.

## Features

- 🤖 Multi-LLM support (OpenAI, Claude, Gemini, Grok)
- 💳 Stripe billing with Free/Pro tiers
- 🔐 Clerk authentication
- 💜 GLTCH personality modes
- 💰 BYOK or managed API keys

## Quick Start

### Frontend (Landing + Dashboard)
```bash
cd gltch_cloud
python -m http.server 8080
# Visit http://localhost:8080
```

### Backend API
```bash
cd api
pip install -r requirements.txt
cp .env.example .env  # Edit with your keys
uvicorn main:app --reload --port 8000
```

## Environment Variables

See `api/.env.example` for all required keys.

## Structure

```
gltch_cloud/
├── index.html      # Landing page
├── login.html      # Login page
├── signup.html     # Signup with provider selection
├── app.html        # Dashboard
├── styles.css      # Main styles
├── app.css         # Dashboard styles
├── auth.css        # Auth page styles
├── script.js       # Landing page JS
├── app.js          # Dashboard JS
├── api-client.js   # Frontend API client
└── api/
    ├── main.py     # FastAPI app
    ├── auth.py     # Clerk auth
    ├── billing.py  # Stripe billing
    ├── llm.py      # LLM providers
    ├── models.py   # Database models
    └── config.py   # Settings
```

## License

MIT
