# BrewBudget ☕

A cozy, developer-inspired budgeting workspace. **A better daily grind.**

## What's built

- Responsive dashboard and finance workspace
- Supabase email/password sign-up and sign-in
- Cookie-based sessions for Next.js App Router
- User-owned profile rows protected by Row Level Security
- Accounts page wired to Plaid Link
- Server-side Plaid Link-token creation and public-token exchange
- Plaid access tokens encrypted with AES-256-GCM before database storage
- Plaid credentials and Supabase secret key kept server-side only

## Important current limitations

- The dashboard's overview, budget, transaction, debt, goals, and report figures are still prototype/sample data. They are not yet persisted to each user's account.
- Bank linking imports account names, types, masks, and current balances. Automatic transaction sync and categorization are the next implementation step.
- Plaid is configured for Sandbox by default. Real bank connections require Plaid Development/Production credentials and any required Plaid production approvals.

## Environment variables

Set these in Vercel (and in a local `.env.local` for local development). Never commit actual secrets.

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Supabase secret key; server only, never `NEXT_PUBLIC_` |
| `PLAID_CLIENT_ID` | Plaid developer dashboard |
| `PLAID_SECRET` | Plaid developer dashboard; server only |
| `PLAID_ENV` | `sandbox`, `development`, or `production` |
| `PLAID_TOKEN_ENCRYPTION_KEY` | Generate a 32-byte key encoded as Base64, e.g. `openssl rand -base64 32`; server only |

The Supabase secret key and Plaid credentials must never be placed in browser code or exposed with a `NEXT_PUBLIC_` prefix. The Plaid access token is encrypted before it is stored. The encrypted-token table has RLS enabled and blocks client access; only the server-side privileged client can read or write it.

## Supabase Auth URL configuration

In Supabase Authentication URL Configuration, set the Site URL to your deployed BrewBudget origin and add redirect URLs for:

- `https://YOUR-VERCEL-DOMAIN/auth/callback`
- `http://localhost:3000/auth/callback`

Replace the Vercel placeholder with your actual deployment domain.

## Plaid setup

1. Create or sign in to a Plaid developer account at https://dashboard.plaid.com/.
2. Copy the Sandbox Client ID and Sandbox Secret into Vercel as server-only environment variables.
3. Generate `PLAID_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32` and add it to Vercel.
4. Set `PLAID_ENV=sandbox` and redeploy.
5. Use Plaid's Sandbox test institution and test credentials to exercise Link.

Plaid Link handles the bank sign-in flow. BrewBudget does not collect or store bank usernames or passwords. The backend exchanges Plaid's one-time public token, then encrypts and stores the long-lived access token server-side.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.
