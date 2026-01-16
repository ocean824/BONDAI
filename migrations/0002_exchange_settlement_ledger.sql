-- Migration: Add exchange settlement, ledger, and immutable events tables
-- Generated: 2026-01-15
-- These tables support the financial compliance spine for settlement and auditing

--> statement-breakpoint
CREATE TABLE "exchange_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"bond_id" integer NOT NULL,
	"investor_id" integer NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"stripe_checkout_session_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"settlement_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_id" integer NOT NULL,
	"settlement_amount" numeric(18, 2) NOT NULL,
	"settlement_method" varchar(50) NOT NULL DEFAULT 'STRIPE',
	"status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"settled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bond_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_id" integer NOT NULL,
	"bond_id" integer NOT NULL,
	"investor_id" integer NOT NULL,
	"ownership_percent" numeric(5, 2) NOT NULL,
	"face_value_amount" numeric(18, 2) NOT NULL,
	"assignment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
	"transferable" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "immutable_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"actor_id" integer,
	"actor_type" varchar(50) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" varchar(255),
	"event_hash" varchar(64) NOT NULL,
	"previous_hash" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_code" varchar(20) NOT NULL UNIQUE,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"normal_balance" varchar(10) NOT NULL DEFAULT 'DEBIT',
	"description" text,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"currency" varchar(3) NOT NULL DEFAULT 'USD',
	"journal_hash" varchar(64) NOT NULL UNIQUE,
	"previous_hash" varchar(64) NOT NULL,
	"is_balanced" boolean NOT NULL DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_code" varchar(20) NOT NULL,
	"debit" numeric(18, 2) NOT NULL DEFAULT '0',
	"credit" numeric(18, 2) NOT NULL DEFAULT '0',
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_event_id" varchar(255) NOT NULL UNIQUE,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'RECEIVED',
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"from_investor_id" integer NOT NULL,
	"to_investor_id" integer NOT NULL,
	"transfer_percent" numeric(5, 2) NOT NULL,
	"transfer_amount" numeric(18, 2) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bond_id" integer NOT NULL,
	"distribution_type" varchar(50) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"recoupment_amount" numeric(18, 2) NOT NULL DEFAULT '0',
	"distribution_amount" numeric(18, 2) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"executed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Foreign key constraints for exchange_trades
ALTER TABLE "exchange_trades" ADD CONSTRAINT "exchange_trades_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exchange_trades" ADD CONSTRAINT "exchange_trades_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exchange_trades" ADD CONSTRAINT "exchange_trades_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for exchange_settlements
ALTER TABLE "exchange_settlements" ADD CONSTRAINT "exchange_settlements_trade_id_exchange_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."exchange_trades"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for bond_assignments
ALTER TABLE "bond_assignments" ADD CONSTRAINT "bond_assignments_trade_id_exchange_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."exchange_trades"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bond_assignments" ADD CONSTRAINT "bond_assignments_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bond_assignments" ADD CONSTRAINT "bond_assignments_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for ledger_postings
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_journal_entry_id_ledger_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."ledger_journal_entries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_account_code_ledger_accounts_account_code_fk" FOREIGN KEY ("account_code") REFERENCES "public"."ledger_accounts"("account_code") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for assignment_transfers
ALTER TABLE "assignment_transfers" ADD CONSTRAINT "assignment_transfers_assignment_id_bond_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."bond_assignments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assignment_transfers" ADD CONSTRAINT "assignment_transfers_from_investor_id_users_id_fk" FOREIGN KEY ("from_investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "assignment_transfers" ADD CONSTRAINT "assignment_transfers_to_investor_id_users_id_fk" FOREIGN KEY ("to_investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for distributions
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Create indexes for performance
CREATE INDEX "idx_exchange_trades_investor_id" ON "exchange_trades"("investor_id");
CREATE INDEX "idx_exchange_trades_status" ON "exchange_trades"("status");
CREATE INDEX "idx_bond_assignments_bond_id" ON "bond_assignments"("bond_id");
CREATE INDEX "idx_bond_assignments_investor_id" ON "bond_assignments"("investor_id");
CREATE INDEX "idx_immutable_events_entity" ON "immutable_events"("entity_type", "entity_id");
CREATE INDEX "idx_immutable_events_correlation" ON "immutable_events"("correlation_id");
CREATE INDEX "idx_immutable_events_hash" ON "immutable_events"("event_hash");
CREATE INDEX "idx_ledger_journal_entries_hash" ON "ledger_journal_entries"("journal_hash");
CREATE INDEX "idx_ledger_postings_account" ON "ledger_postings"("account_code");
CREATE INDEX "idx_stripe_webhooks_event_id" ON "stripe_webhooks"("stripe_event_id");
CREATE INDEX "idx_stripe_webhooks_status" ON "stripe_webhooks"("status");
