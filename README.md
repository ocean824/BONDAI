# BondAI Platform - Complete Implementation

This is a fully functional BondAI platform with all work packages implemented as per the KEY CONTEXT documentation.

## 📋 Work Packages Completed

| # | Work Package | Status | Description |
|---|-------------|--------|-------------|
| WP1 | Database Schema Sync | ✅ Complete | 22 tables with proper migrations |
| WP5 | Payment Settlement | ✅ Complete | Stripe checkout, webhooks, settlement |
| WP6 | Immutable Events + Ledger | ✅ Complete | Hash-chained audit, double-entry accounting |
| WP7 | Assignments & Rights Transfer | ✅ Complete | Cap table, ownership tracking, transfers |
| WP4 | Auction Award Flow | ✅ Complete | Trade creation on reserve met |
| WP8 | Dividend Distribution Engine | ✅ Complete | Receipt processing, 1/3 split, payouts |
| WP9 | Underwriting Engine | ✅ Complete | Risk scoring, Monte Carlo simulation |
| WP10 | Surety Tracking | ✅ Complete | Claims, reconciliations, exposure reports |
| WP11 | Document Generation | ✅ Complete | Due diligence ZIP, email pipeline |
| WP12 | Tests + Security | ✅ Complete | Vitest, rate limiting, security middleware |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Stripe account (for payments)
- OpenAI API key (for AI extraction)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# Security
JWT_SECRET=your-secret-key
SURETY_ADMIN_PIN=your-pin

# Replit (optional)
REPLIT_CONNECTORS_HOSTNAME=...
REPLIT_DEPLOYMENT=1
```

---

## 📁 Project Structure

```
BONDAI-main/
├── server/
│   ├── index.ts              # Express server entry
│   ├── routes.ts             # All API routes
│   ├── db.ts                 # Database connection
│   ├── webhookHandlers.ts    # Stripe webhook handling
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   └── security.ts       # Rate limiting, CORS, headers
│   └── services/
│       ├── tradeService.ts           # Trade & settlement
│       ├── ledgerService.ts          # Double-entry ledger
│       ├── immutableEventService.ts  # Audit logging
│       ├── assignmentService.ts      # Bond ownership
│       ├── distributionService.ts    # Dividends
│       ├── underwritingEnhancedService.ts  # Risk scoring
│       ├── suretyEnhancedService.ts  # Surety tracking
│       └── documentEmailService.ts   # Docs & email
├── shared/
│   └── schema.ts             # Drizzle schema (22 tables)
├── migrations/               # Database migrations
├── client/                   # React frontend
├── tests/                    # Vitest unit tests
├── vitest.config.ts
└── package.json
```

---

## 📊 Database Schema (22 Tables)

### Core Tables
- `users` - User accounts with RBAC
- `judgments` - Judgment data
- `bonds` - Bond records
- `bundles` - Judgment bundles

### Auction System
- `auctions` - Auction listings
- `auction_bids` - Bid records

### Exchange/Finance
- `exchange_trades` - Trade records
- `exchange_settlements` - Settlement records
- `bond_assignments` - Ownership tracking
- `assignment_transfers` - Rights transfers
- `distributions` - Dividend payouts

### Surety System
- `surety_trusts` - Surety providers
- `surety_cases` - Underwriting cases
- `surety_collateral` - Collateral tracking
- `surety_indemnitors` - Indemnitor tracking
- `surety_documents` - Surety documents

### Underwriting & Compliance
- `underwriting_cases` - Underwriting data
- `underwriting_parties` - Party data
- `trending_topics` - Market intelligence
- `trending_summaries` - AI summaries

### Compliance Spine
- `ledger_accounts` - Chart of accounts
- `ledger_journal_entries` - Journal entries
- `ledger_postings` - Account postings
- `immutable_events` - Hash-chained audit log
- `bond_process_documents` - Process documents
- `stripe_webhooks` - Webhook tracking

---

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Judgments
- `GET /api/judgments` - List judgments
- `POST /api/judgments` - Create judgment
- `POST /api/judgments/:id/extract` - AI extraction
- `POST /api/judgments/:id/price` - Pricing scenarios

### Bonds
- `GET /api/bonds` - List bonds
- `POST /api/bonds` - Create bond
- `POST /api/bonds/:id/score` - Risk scoring

### Auctions
- `GET /api/auctions` - List auctions
- `POST /api/auctions` - Create auction
- `POST /api/auctions/:id/bids` - Place bid
- `GET /api/auctions/:id` - Get auction details

### Investor Routes
- `GET /api/investor/auctions` - Active auctions
- `POST /api/investor/auctions/:id/bids` - Place bid
- `GET /api/investor/holdings` - Bond holdings
- `GET /api/investor/trades` - Trade history
- `POST /api/investor/trades/:id/checkout` - Stripe checkout
- `POST /api/investor/trades/:id/settle` - Manual settlement

### Trade & Settlement
- `GET /api/investor/trades` - List trades
- `POST /api/investor/trades/:id/checkout` - Create checkout
- `POST /api/investor/trades/:id/settle` - Settle trade

### Assignments & Transfers
- `GET /api/investor/holdings` - Bond holdings
- `GET /api/bonds/:id/cap-table` - Ownership table
- `POST /api/investor/assignments/:id/transfer` - Request transfer

### Distributions
- `POST /api/admin/bonds/:id/receipt` - Record receipt
- `POST /api/admin/distributions/:id/execute` - Execute payout
- `GET /api/bonds/:id/distributions` - Distribution history
- `GET /api/investor/distributions` - Investor payouts

### Underwriting
- `POST /api/underwriting/cases` - Create case
- `POST /api/underwriting/cases/:id/risk-score` - Calculate risk
- `GET /api/underwriting/cases/:id/report` - Full report
- `POST /api/underwriting/analyze` - Quick analysis

### Surety
- `GET /api/admin/surety/cases` - List cases
- `POST /api/admin/surety/underwrite` - Run underwriting
- `POST /api/admin/surety/cases/:id/claims` - File claim
- `POST /api/admin/surety/trusts/:id/reconcile` - Run reconciliation
- `GET /api/admin/surety/trusts/:id/exposure` - Exposure report
- `GET /api/admin/surety/portfolio` - Portfolio summary

### Document Engine
- `GET /api/admin/docs/steps` - Available steps
- `POST /api/admin/bonds/:bondId/generate-docs` - Generate docs
- `GET /api/bonds/:id/due-diligence` - Due diligence metadata
- `POST /api/bonds/:id/due-diligence/zip` - Generate ZIP
- `POST /api/bonds/:id/due-diligence/send` - Email package

### Ledger & Audit
- `GET /api/admin/ledger/trial-balance` - Trial balance
- `GET /api/admin/ledger/journal` - Journal entries
- `GET /api/admin/audit/events` - Event log
- `POST /api/admin/audit/verify-chain` - Verify integrity

### Email
- `POST /api/admin/email/send` - Send email
- `GET /api/admin/email/queue` - Queue status
- `POST /api/admin/email/process-queue` - Process queue

---

## 🔒 Security Features

- **Rate Limiting** - API, auth, payment, webhook limiters
- **Security Headers** - Helmet CSP, HSTS, etc.
- **CORS** - Configurable origin restrictions
- **Authentication** - JWT with role-based access
- **Input Sanitization** - Null byte removal
- **Error Handling** - Structured error responses
- **Audit Logging** - Immutable event chain

---

## 🧪 Testing

```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 🚀 Deployment

### Replit Deployment

1. Push to GitHub: `https://github.com/ocean824/BONDAI`
2. Import into Replit
3. Set environment variables in Replit Secrets
4. Deploy with Replit Autoscale

### Manual Deployment

```bash
# Build
npm run build

# Start production
npm start
```

---

## 📝 License

MIT License - See LICENSE file for details.
