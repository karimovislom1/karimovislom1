# Agrobank Microfinance AI Calling Agent (Uzbek) with Vapi

This repository provides a secure starter implementation for a **customer service AI calling agent** for **Agrobank microfinance**, built with **Vapi**.

## What this solution includes

- A production-ready **Vapi assistant configuration** focused on fluent Uzbek conversations.
- A **secure webhook service** for tool calls (microfinance Q&A and product info lookups).
- Security controls:
  - HMAC request signature verification
  - API key protection for internal endpoints
  - Basic rate limiting
  - Input sanitization
  - Structured logging without sensitive user data
- A sample Uzbek microfinance knowledge base to answer customer questions.

## Architecture

1. Customer calls your Vapi number.
2. Vapi routes the call to your Uzbek-speaking assistant.
3. Assistant handles common questions directly.
4. For verified data or dynamic product info, assistant calls your secure webhook tool.
5. Webhook validates request signature and returns allowed data only.

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Set:

- `PORT`
- `VAPI_WEBHOOK_SECRET`
- `INTERNAL_API_KEY`
- `TRUST_PROXY` (if deployed behind a reverse proxy)

### 3) Run the secure webhook server

```bash
npm run dev
```

### 4) Create assistant in Vapi

Use the payload from `vapi/assistant-config.json`.

You can create/update via Vapi dashboard or API.

## Security checklist (must-have)

- Use HTTPS only.
- Store secrets in a secret manager (not in source control).
- Rotate `VAPI_WEBHOOK_SECRET` and `INTERNAL_API_KEY` regularly.
- Log request IDs and event types, not full customer PII.
- Restrict outbound data to approved product fields.
- Add WAF/IP rules and advanced rate limits in production.
- Perform prompt-injection and jailbreak testing before launch.

## Uzbek behavior requirements encoded in assistant prompt

The assistant is instructed to:

- Speak fluent, polite Uzbek (`siz` form).
- Stay concise and practical.
- Never fabricate policy data.
- Escalate to a human operator when uncertain.
- Avoid collecting unnecessary personal data.

## Example test call flow

1. Caller: "Assalomu alaykum, mikroqarz foizi qancha?"
2. Agent: Gives current general range and clarifies product type.
3. Agent calls tool for product-specific data.
4. Tool returns approved details only.
5. Agent summarizes clearly in Uzbek and offers next step.

## Deployment notes

- Recommended runtime: Node.js 20+
- Place behind API gateway or reverse proxy.
- Add centralized audit logging and SIEM integration.
- For regulated workloads, add encryption-at-rest and strict retention windows.

---

If you want, this can be extended with:

- CRM integration (customer status lookup with consent)
- OTP-based verification flow
- Human handoff routing by branch/region/language
- Real-time analytics dashboard
