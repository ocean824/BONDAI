-- Migration: Add missing tables for auctions, underwriting, surety system, and document engine
-- Generated: 2026-01-15
-- This migration adds all tables defined in schema.ts that are not in the initial migration

--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bond_id" integer NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reserve_price" numeric(18, 2) NOT NULL,
	"winning_bid_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auction_bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"investor_id" integer NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trending_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(100) NOT NULL DEFAULT 'news',
	"external_id" text,
	"title" text NOT NULL,
	"url" text,
	"category" varchar(100),
	"score" numeric(6, 3) DEFAULT '0',
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "trending_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"summary" text NOT NULL,
	"bullet_points" jsonb DEFAULT '[]',
	"risk_level" varchar(50),
	"sentiment" varchar(50),
	"relevance_score" numeric(6, 3) DEFAULT '0',
	"model" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "underwriting_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"case_input" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "underwriting_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"party_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surety_trusts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"trust_type" varchar(50) NOT NULL DEFAULT 'IRREVOCABLE',
	"can_act_as_surety" boolean NOT NULL DEFAULT true,
	"allowed_bond_types" jsonb DEFAULT '["JUDGMENT"]',
	"max_single_bond_limit" numeric(18, 2) NOT NULL,
	"aggregate_bond_limit" numeric(18, 2) NOT NULL,
	"current_exposure" numeric(18, 2) NOT NULL DEFAULT '0',
	"requires_insurance_above" numeric(18, 2) NOT NULL DEFAULT '0',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surety_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"bond_id" integer NOT NULL,
	"surety_trust_id" integer NOT NULL,
	"status" varchar(50) NOT NULL DEFAULT 'DRAFT',
	"bond_type" varchar(50) NOT NULL DEFAULT 'JUDGMENT',
	"bond_penal_sum" numeric(18, 2) NOT NULL,
	"principal_id" integer,
	"principal_risk_score" numeric(5, 2),
	"collateral_required_amount" numeric(18, 2) NOT NULL DEFAULT '0',
	"collateral_type_allowed" jsonb DEFAULT '["CASH", "ILOC"]',
	"indemnity_required" varchar(10) NOT NULL DEFAULT 'YES',
	"insurance_required" varchar(10) NOT NULL DEFAULT 'NO',
	"underwriter_user_id" integer,
	"decision_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surety_indemnitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"indemnitor_type" varchar(50) NOT NULL,
	"party_id" integer NOT NULL,
	"ownership_percent" numeric(5, 2),
	"is_spouse" varchar(10) NOT NULL DEFAULT 'NO',
	"signature_status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surety_collateral" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"required_amount" numeric(18, 2) NOT NULL,
	"posted_amount" numeric(18, 2) NOT NULL DEFAULT '0',
	"collateral_type" varchar(20) NOT NULL,
	"iloc_bank_name" varchar(255),
	"iloc_reference" varchar(255),
	"held_from" timestamp with time zone,
	"release_eligible_date" timestamp with time zone,
	"released_at" timestamp with time zone,
	"status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surety_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"signature_status" varchar(20) NOT NULL DEFAULT 'PENDING',
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bond_process_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"bond_id" integer NOT NULL,
	"generated_by" integer NOT NULL,
	"process_step" varchar(50) NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'DRAFT',
	"surety_case_id" integer,
	"surety_trust_id" integer,
	"auction_id" integer,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Foreign key constraints for auctions
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for auction_bids
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for trending_summaries
ALTER TABLE "trending_summaries" ADD CONSTRAINT "trending_summaries_topic_id_trending_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."trending_topics"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for underwriting_cases
ALTER TABLE "underwriting_cases" ADD CONSTRAINT "underwriting_cases_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for underwriting_parties
ALTER TABLE "underwriting_parties" ADD CONSTRAINT "underwriting_parties_case_id_underwriting_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."underwriting_cases"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for surety_cases
ALTER TABLE "surety_cases" ADD CONSTRAINT "surety_cases_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "surety_cases" ADD CONSTRAINT "surety_cases_surety_trust_id_surety_trusts_id_fk" FOREIGN KEY ("surety_trust_id") REFERENCES "public"."surety_trusts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "surety_cases" ADD CONSTRAINT "surety_cases_underwriter_user_id_users_id_fk" FOREIGN KEY ("underwriter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for surety_indemnitors
ALTER TABLE "surety_indemnitors" ADD CONSTRAINT "surety_indemnitors_case_id_surety_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."surety_cases"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for surety_collateral
ALTER TABLE "surety_collateral" ADD CONSTRAINT "surety_collateral_case_id_surety_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."surety_cases"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for surety_documents
ALTER TABLE "surety_documents" ADD CONSTRAINT "surety_documents_case_id_surety_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."surety_cases"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Foreign key constraints for bond_process_documents
ALTER TABLE "bond_process_documents" ADD CONSTRAINT "bond_process_documents_bond_id_bonds_id_fk" FOREIGN KEY ("bond_id") REFERENCES "public"."bonds"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bond_process_documents" ADD CONSTRAINT "bond_process_documents_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bond_process_documents" ADD CONSTRAINT "bond_process_documents_surety_case_id_surety_cases_id_fk" FOREIGN KEY ("surety_case_id") REFERENCES "public"."surety_cases"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bond_process_documents" ADD CONSTRAINT "bond_process_documents_surety_trust_id_surety_trusts_id_fk" FOREIGN KEY ("surety_trust_id") REFERENCES "public"."surety_trusts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bond_process_documents" ADD CONSTRAINT "bond_process_documents_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;
