# BrewBudget ☕

A cozy, developer-inspired budgeting workspace. **A better daily grind.**

## Current prototype
- Responsive dashboard with a Liquid Glass-inspired visual system
- Monthly / biweekly period switcher
- Cash-flow visualization
- Spending category progress
- Recent transactions and in-session expense entry
- Overview, Budgets, Transactions, Accounts, Goals, and Reports navigation
- Daily Grind check-in card

> The current dashboard uses illustrative demo data. No bank is connected and no real financial information is being retrieved or stored.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Planned integrations
- Supabase Auth + Postgres with row-level security
- Plaid Link and server-side transaction sync
- Household workspaces and invitations
- Persistent monthly and biweekly budget periods

Never expose Plaid secrets or Supabase service-role keys in browser code. Use server-side routes and environment variables.
