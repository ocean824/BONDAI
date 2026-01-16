import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, boolean, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("analyst"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("none"),
  subscriptionTier: varchar("subscription_tier", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const judgments = pgTable("judgments", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  debtorName: varchar("debtor_name", { length: 255 }),
  caseNumber: varchar("case_number", { length: 255 }),
  court: varchar("court", { length: 255 }),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  judgmentAmount: decimal("judgment_amount", { precision: 18, scale: 2 }),
  judgmentDate: timestamp("judgment_date", { withTimezone: true }),
  status: varchar("status", { length: 50 }).notNull().default("uploaded"),
  fileName: varchar("file_name", { length: 500 }),
  notes: text("notes"),
  rawFields: jsonb("raw_fields"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recoveryScores = pgTable("recovery_scores", {
  id: serial("id").primaryKey(),
  judgmentId: integer("judgment_id").notNull().references(() => judgments.id),
  score: integer("score").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  reasoning: text("reasoning"),
  modelUsed: varchar("model_used", { length: 100 }),
  factorsJson: jsonb("factors_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const priceEstimates = pgTable("price_estimates", {
  id: serial("id").primaryKey(),
  judgmentId: integer("judgment_id").notNull().references(() => judgments.id),
  scenarioName: varchar("scenario_name", { length: 50 }).notNull().default("base"),
  targetIRR: decimal("target_irr", { precision: 5, scale: 2 }).notNull(),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).notNull(),
  expectedRecoveryPct: decimal("expected_recovery_pct", { precision: 5, scale: 2 }).notNull(),
  recommendedPurchasePrice: decimal("recommended_purchase_price", { precision: 18, scale: 2 }).notNull(),
  scenarioJson: jsonb("scenario_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bundles = pgTable("bundles", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  metricsJson: jsonb("metrics_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bundleJudgments = pgTable("bundle_judgments", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull().references(() => bundles.id),
  judgmentId: integer("judgment_id").notNull().references(() => judgments.id),
  tranche: varchar("tranche", { length: 50 }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bonds = pgTable("bonds", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  cusip: varchar("cusip", { length: 20 }),
  isin: varchar("isin", { length: 20 }),
  ticker: varchar("ticker", { length: 20 }),
  faceValue: decimal("face_value", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  couponRate: decimal("coupon_rate", { precision: 6, scale: 3 }),
  couponType: varchar("coupon_type", { length: 50 }).default("fixed"),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  issueDate: timestamp("issue_date", { withTimezone: true }),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  governingLaw: varchar("governing_law", { length: 255 }),
  
  bondScore: integer("bond_score"),
  riskTier: varchar("risk_tier", { length: 20 }),
  
  // Exchange/perfection fields
  isPerfected: boolean("is_perfected").notNull().default(false),
  perfectedAt: timestamp("perfected_at", { withTimezone: true }),
  expectedPerfectedAt: timestamp("expected_perfected_at", { withTimezone: true }),
  currentAuctionId: integer("current_auction_id"),
  
  // Surety fields
  bondType: varchar("bond_type", { length: 50 }).notNull().default("JUDGMENT"),
  suretyCaseId: integer("surety_case_id"),
  suretyTrustId: integer("surety_trust_id"),
  suretyStatus: varchar("surety_status", { length: 50 }).default("NONE"), // NONE | IN_UNDERWRITING | APPROVED | DECLINED
  
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Auction status types: PENDING | ACTIVE | RESERVE_MET | COMPLETED | CANCELLED | EXPIRED
export const auctions = pgTable("auctions", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reservePrice: decimal("reserve_price", { precision: 18, scale: 2 }).notNull(),
  winningBidId: integer("winning_bid_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auctionBids = pgTable("auction_bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull().references(() => auctions.id, { onDelete: "cascade" }),
  investorId: integer("investor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bondDocuments = pgTable("bond_documents", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: varchar("storage_path", { length: 1000 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull().default("supporting"),
  description: text("description"),
  aiSummary: text("ai_summary"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id),
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Trending topics & summaries
export const trendingTopics = pgTable("trending_topics", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 100 }).notNull().default("news"),
  externalId: text("external_id"),
  title: text("title").notNull(),
  url: text("url"),
  category: varchar("category", { length: 100 }),
  score: decimal("score", { precision: 6, scale: 3 }).default("0"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const trendingSummaries = pgTable("trending_summaries", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => trendingTopics.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  bulletPoints: jsonb("bullet_points").$type<string[]>().default([]),
  riskLevel: varchar("risk_level", { length: 50 }),
  sentiment: varchar("sentiment", { length: 50 }),
  relevanceScore: decimal("relevance_score", { precision: 6, scale: 3 }).default("0"),
  model: varchar("model", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Underwriting cases and parties
export const underwritingCases = pgTable("underwriting_cases", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  caseInput: jsonb("case_input").notNull().$type<Record<string, unknown>>(),
  metrics: jsonb("metrics").notNull().$type<Record<string, unknown>>(),
  narrative: text("narrative"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const underwritingParties = pgTable("underwriting_parties", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => underwritingCases.id, { onDelete: "cascade" }),
  partyData: jsonb("party_data").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== SURETY SYSTEM TABLES =====
// Surety trusts that can act as surety for judgment bonds
export const suretyTrusts = pgTable("surety_trusts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  trustType: varchar("trust_type", { length: 50 }).notNull().default("IRREVOCABLE"), // REVOCABLE | IRREVOCABLE | OTHER
  canActAsSurety: boolean("can_act_as_surety").notNull().default(true),
  allowedBondTypes: jsonb("allowed_bond_types").$type<string[]>().default(["JUDGMENT"]),
  maxSingleBondLimit: decimal("max_single_bond_limit", { precision: 18, scale: 2 }).notNull(),
  aggregateBondLimit: decimal("aggregate_bond_limit", { precision: 18, scale: 2 }).notNull(),
  currentExposure: decimal("current_exposure", { precision: 18, scale: 2 }).notNull().default("0"),
  requiresInsuranceAbove: decimal("requires_insurance_above", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Surety case status: DRAFT | IN_REVIEW | APPROVED | DECLINED | APPROVED_WITH_COLLATERAL | DOCS_PENDING_SIGNATURE | ACTIVE | RELEASED
export const suretyCases = pgTable("surety_cases", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id, { onDelete: "cascade" }),
  suretyTrustId: integer("surety_trust_id").notNull().references(() => suretyTrusts.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 50 }).notNull().default("DRAFT"),
  bondType: varchar("bond_type", { length: 50 }).notNull().default("JUDGMENT"),
  bondPenalSum: decimal("bond_penal_sum", { precision: 18, scale: 2 }).notNull(),
  principalId: integer("principal_id"),
  principalRiskScore: decimal("principal_risk_score", { precision: 5, scale: 2 }),
  collateralRequiredAmount: decimal("collateral_required_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  collateralTypeAllowed: jsonb("collateral_type_allowed").$type<string[]>().default(["CASH", "ILOC"]),
  indemnityRequired: varchar("indemnity_required", { length: 10 }).notNull().default("YES"),
  insuranceRequired: varchar("insurance_required", { length: 10 }).notNull().default("NO"),
  underwriterUserId: integer("underwriter_user_id").references(() => users.id),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Surety indemnitors for a case
export const suretyIndemnitors = pgTable("surety_indemnitors", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => suretyCases.id, { onDelete: "cascade" }),
  indemnitorType: varchar("indemnitor_type", { length: 50 }).notNull(), // PRINCIPAL_ENTITY | OWNER | SPOUSE | TRUST | AFFILIATE
  partyId: integer("party_id").notNull(),
  ownershipPercent: decimal("ownership_percent", { precision: 5, scale: 2 }),
  isSpouse: varchar("is_spouse", { length: 10 }).notNull().default("NO"),
  signatureStatus: varchar("signature_status", { length: 20 }).notNull().default("PENDING"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Surety collateral tracking
export const suretyCollateral = pgTable("surety_collateral", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => suretyCases.id, { onDelete: "cascade" }),
  requiredAmount: decimal("required_amount", { precision: 18, scale: 2 }).notNull(),
  postedAmount: decimal("posted_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  collateralType: varchar("collateral_type", { length: 20 }).notNull(), // CASH | ILOC
  ilocBankName: varchar("iloc_bank_name", { length: 255 }),
  ilocReference: varchar("iloc_reference", { length: 255 }),
  heldFrom: timestamp("held_from", { withTimezone: true }),
  releaseEligibleDate: timestamp("release_eligible_date", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | POSTED | HELD | RELEASED
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Surety documents (GIA, collateral agreements, trust resolutions)
export const suretyDocuments = pgTable("surety_documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => suretyCases.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 50 }).notNull(), // GIA | COLLATERAL_AGREEMENT | TRUST_RESOLUTION | OTHER
  storagePath: varchar("storage_path", { length: 1000 }).notNull(),
  signatureStatus: varchar("signature_status", { length: 20 }).notNull().default("PENDING"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== DOCUMENT ENGINE - Bond Process Documents =====
// Tracks all documents generated at each step of the bond lifecycle
export const bondProcessDocuments = pgTable("bond_process_documents", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id, { onDelete: "cascade" }),
  generatedBy: integer("generated_by").notNull().references(() => users.id),
  processStep: varchar("process_step", { length: 50 }).notNull(), // JUDGMENT_TO_BOND | PERFECTION | SURETY_UNDERWRITING | SURETY_ACTIVATION | EXCHANGE_LISTING | EXCHANGE_SALE | TRUST_ALLOCATION
  docType: varchar("doc_type", { length: 50 }).notNull(), // BOND_TERM_SHEET | BOND_INSTRUMENT | PERFECTION_CERT | GIA | etc.
  storagePath: varchar("storage_path", { length: 1000 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"), // DRAFT | FINAL | SIGNED | ARCHIVED
  suretyCaseId: integer("surety_case_id").references(() => suretyCases.id),
  suretyTrustId: integer("surety_trust_id").references(() => suretyTrusts.id),
  auctionId: integer("auction_id").references(() => auctions.id),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== EXCHANGE SETTLEMENT TABLES =====
// Trade records for bond purchases
export const exchangeTrades = pgTable("exchange_trades", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull().references(() => auctions.id),
  bondId: integer("bond_id").notNull().references(() => bonds.id),
  investorId: integer("investor_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | PAID | SETTLED | FAILED | CANCELLED
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  settlementId: varchar("settlement_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Settlement records for completed trades
export const exchangeSettlements = pgTable("exchange_settlements", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => exchangeTrades.id, { onDelete: "cascade" }),
  settlementAmount: decimal("settlement_amount", { precision: 18, scale: 2 }).notNull(),
  settlementMethod: varchar("settlement_method", { length: 50 }).notNull().default("STRIPE"),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | COMPLETED | FAILED
  settledAt: timestamp("settled_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Bond assignments - tracks ownership slices
export const bondAssignments = pgTable("bond_assignments", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => exchangeTrades.id, { onDelete: "cascade" }),
  bondId: integer("bond_id").notNull().references(() => bonds.id),
  investorId: integer("investor_id").notNull().references(() => users.id),
  ownershipPercent: decimal("ownership_percent", { precision: 5, scale: 2 }).notNull(),
  faceValueAmount: decimal("face_value_amount", { precision: 18, scale: 2 }).notNull(),
  assignmentDate: timestamp("assignment_date", { withTimezone: true }).defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE | TRANSFERRED | REVOKED
  transferable: boolean("transferable").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Assignment transfers between investors
export const assignmentTransfers = pgTable("assignment_transfers", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => bondAssignments.id, { onDelete: "cascade" }),
  fromInvestorId: integer("from_investor_id").notNull().references(() => users.id),
  toInvestorId: integer("to_investor_id").notNull().references(() => users.id),
  transferPercent: decimal("transfer_percent", { precision: 5, scale: 2 }).notNull(),
  transferAmount: decimal("transfer_amount", { precision: 18, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | APPROVED | EXECUTED | REJECTED
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== DISTRIBUTION TABLES =====
export const distributions = pgTable("distributions", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id),
  distributionType: varchar("distribution_type", { length: 50 }).notNull(), // INTEREST | PRINCIPAL | DIVIDEND
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).notNull(),
  recoupmentAmount: decimal("recoupment_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  distributionAmount: decimal("distribution_amount", { precision: 18, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | EXECUTED | CANCELLED
  executedAt: timestamp("executed_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== LEDGER TABLES =====
export const ledgerAccounts = pgTable("ledger_accounts", {
  id: serial("id").primaryKey(),
  accountCode: varchar("account_code", { length: 20 }).notNull().unique(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(), // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  normalBalance: varchar("normal_balance", { length: 10 }).notNull().default("DEBIT"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ledgerJournalEntries = pgTable("ledger_journal_entries", {
  id: serial("id").primaryKey(),
  journalType: varchar("journal_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  journalHash: varchar("journal_hash", { length: 64 }).notNull().unique(),
  previousHash: varchar("previous_hash", { length: 64 }).notNull(),
  isBalanced: boolean("is_balanced").notNull().default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ledgerPostings = pgTable("ledger_postings", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull().references(() => ledgerJournalEntries.id, { onDelete: "cascade" }),
  accountCode: varchar("account_code", { length: 20 }).notNull().references(() => ledgerAccounts.accountCode),
  debit: decimal("debit", { precision: 18, scale: 2 }).notNull().default("0"),
  credit: decimal("credit", { precision: 18, scale: 2 }).notNull().default("0"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== IMMUTABLE EVENTS TABLE =====
export const immutableEvents = pgTable("immutable_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  actorId: integer("actor_id"),
  actorType: varchar("actor_type", { length: 50 }).notNull(), // USER | SYSTEM | ADMIN | API
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  payload: jsonb("payload").notNull(),
  correlationId: varchar("correlation_id", { length: 255 }),
  eventHash: varchar("event_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ===== STRIPE WEBHOOKS TABLE =====
export const stripeWebhooks = pgTable("stripe_webhooks", {
  id: serial("id").primaryKey(),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull().unique(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("RECEIVED"), // RECEIVED | PROCESSED | FAILED
  processedAt: timestamp("processed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  judgments: many(judgments),
  bundles: many(bundles),
  bonds: many(bonds),
  chatSessions: many(chatSessions),
}));

export const judgmentsRelations = relations(judgments, ({ one, many }) => ({
  owner: one(users, {
    fields: [judgments.ownerId],
    references: [users.id],
  }),
  recoveryScores: many(recoveryScores),
  priceEstimates: many(priceEstimates),
  bundleJudgments: many(bundleJudgments),
}));

export const recoveryScoresRelations = relations(recoveryScores, ({ one }) => ({
  judgment: one(judgments, {
    fields: [recoveryScores.judgmentId],
    references: [judgments.id],
  }),
}));

export const priceEstimatesRelations = relations(priceEstimates, ({ one }) => ({
  judgment: one(judgments, {
    fields: [priceEstimates.judgmentId],
    references: [judgments.id],
  }),
}));

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  owner: one(users, {
    fields: [bundles.ownerId],
    references: [users.id],
  }),
  bundleJudgments: many(bundleJudgments),
}));

export const bundleJudgmentsRelations = relations(bundleJudgments, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleJudgments.bundleId],
    references: [bundles.id],
  }),
  judgment: one(judgments, {
    fields: [bundleJudgments.judgmentId],
    references: [judgments.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const bondsRelations = relations(bonds, ({ one, many }) => ({
  owner: one(users, {
    fields: [bonds.ownerId],
    references: [users.id],
  }),
  documents: many(bondDocuments),
  auctions: many(auctions),
}));

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  bond: one(bonds, {
    fields: [auctions.bondId],
    references: [bonds.id],
  }),
  bids: many(auctionBids),
}));

export const auctionBidsRelations = relations(auctionBids, ({ one }) => ({
  auction: one(auctions, {
    fields: [auctionBids.auctionId],
    references: [auctions.id],
  }),
  investor: one(users, {
    fields: [auctionBids.investorId],
    references: [users.id],
  }),
}));

export const bondDocumentsRelations = relations(bondDocuments, ({ one }) => ({
  bond: one(bonds, {
    fields: [bondDocuments.bondId],
    references: [bonds.id],
  }),
  owner: one(users, {
    fields: [bondDocuments.ownerId],
    references: [users.id],
  }),
}));

export const trendingTopicsRelations = relations(trendingTopics, ({ many }) => ({
  summaries: many(trendingSummaries),
}));

export const trendingSummariesRelations = relations(trendingSummaries, ({ one }) => ({
  topic: one(trendingTopics, {
    fields: [trendingSummaries.topicId],
    references: [trendingTopics.id],
  }),
}));

export const underwritingCasesRelations = relations(underwritingCases, ({ one, many }) => ({
  owner: one(users, {
    fields: [underwritingCases.ownerId],
    references: [users.id],
  }),
  parties: many(underwritingParties),
}));

export const underwritingPartiesRelations = relations(underwritingParties, ({ one }) => ({
  case: one(underwritingCases, {
    fields: [underwritingParties.caseId],
    references: [underwritingCases.id],
  }),
}));

// Surety relations
export const suretyTrustsRelations = relations(suretyTrusts, ({ many }) => ({
  cases: many(suretyCases),
}));

export const suretyCasesRelations = relations(suretyCases, ({ one, many }) => ({
  bond: one(bonds, {
    fields: [suretyCases.bondId],
    references: [bonds.id],
  }),
  trust: one(suretyTrusts, {
    fields: [suretyCases.suretyTrustId],
    references: [suretyTrusts.id],
  }),
  underwriter: one(users, {
    fields: [suretyCases.underwriterUserId],
    references: [users.id],
  }),
  indemnitors: many(suretyIndemnitors),
  collaterals: many(suretyCollateral),
  documents: many(suretyDocuments),
}));

export const suretyIndemnitorsRelations = relations(suretyIndemnitors, ({ one }) => ({
  case: one(suretyCases, {
    fields: [suretyIndemnitors.caseId],
    references: [suretyCases.id],
  }),
}));

export const suretyCollateralRelations = relations(suretyCollateral, ({ one }) => ({
  case: one(suretyCases, {
    fields: [suretyCollateral.caseId],
    references: [suretyCases.id],
  }),
}));

export const suretyDocumentsRelations = relations(suretyDocuments, ({ one }) => ({
  case: one(suretyCases, {
    fields: [suretyDocuments.caseId],
    references: [suretyCases.id],
  }),
}));

export const bondProcessDocumentsRelations = relations(bondProcessDocuments, ({ one }) => ({
  bond: one(bonds, {
    fields: [bondProcessDocuments.bondId],
    references: [bonds.id],
  }),
  generatedByUser: one(users, {
    fields: [bondProcessDocuments.generatedBy],
    references: [users.id],
  }),
  suretyCase: one(suretyCases, {
    fields: [bondProcessDocuments.suretyCaseId],
    references: [suretyCases.id],
  }),
  suretyTrust: one(suretyTrusts, {
    fields: [bondProcessDocuments.suretyTrustId],
    references: [suretyTrusts.id],
  }),
  auction: one(auctions, {
    fields: [bondProcessDocuments.auctionId],
    references: [auctions.id],
  }),
}));

// Exchange trade relations
export const exchangeTradesRelations = relations(exchangeTrades, ({ one, many }) => ({
  auction: one(auctions, {
    fields: [exchangeTrades.auctionId],
    references: [auctions.id],
  }),
  bond: one(bonds, {
    fields: [exchangeTrades.bondId],
    references: [bonds.id],
  }),
  investor: one(users, {
    fields: [exchangeTrades.investorId],
    references: [users.id],
  }),
  settlements: many(exchangeSettlements),
  assignments: many(bondAssignments),
}));

export const exchangeSettlementsRelations = relations(exchangeSettlements, ({ one }) => ({
  trade: one(exchangeTrades, {
    fields: [exchangeSettlements.tradeId],
    references: [exchangeTrades.id],
  }),
}));

export const bondAssignmentsRelations = relations(bondAssignments, ({ one, many }) => ({
  trade: one(exchangeTrades, {
    fields: [bondAssignments.tradeId],
    references: [exchangeTrades.id],
  }),
  bond: one(bonds, {
    fields: [bondAssignments.bondId],
    references: [bonds.id],
  }),
  investor: one(users, {
    fields: [bondAssignments.investorId],
    references: [users.id],
  }),
  transfers: many(assignmentTransfers),
}));

export const assignmentTransfersRelations = relations(assignmentTransfers, ({ one }) => ({
  assignment: one(bondAssignments, {
    fields: [assignmentTransfers.assignmentId],
    references: [bondAssignments.id],
  }),
  fromInvestor: one(users, {
    fields: [assignmentTransfers.fromInvestorId],
    references: [users.id],
  }),
  toInvestor: one(users, {
    fields: [assignmentTransfers.toInvestorId],
    references: [users.id],
  }),
}));

export const distributionsRelations = relations(distributions, ({ one }) => ({
  bond: one(bonds, {
    fields: [distributions.bondId],
    references: [bonds.id],
  }),
}));

export const ledgerAccountsRelations = relations(ledgerAccounts, ({ many }) => ({
  postings: many(ledgerPostings),
}));

export const ledgerJournalEntriesRelations = relations(ledgerJournalEntries, ({ many }) => ({
  postings: many(ledgerPostings),
}));

export const ledgerPostingsRelations = relations(ledgerPostings, ({ one }) => ({
  journalEntry: one(ledgerJournalEntries, {
    fields: [ledgerPostings.journalEntryId],
    references: [ledgerJournalEntries.id],
  }),
  account: one(ledgerAccounts, {
    fields: [ledgerPostings.accountCode],
    references: [ledgerAccounts.accountCode],
  }),
}));

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertJudgmentSchema = createInsertSchema(judgments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecoveryScoreSchema = createInsertSchema(recoveryScores).omit({
  id: true,
  createdAt: true,
});

export const insertPriceEstimateSchema = createInsertSchema(priceEstimates).omit({
  id: true,
  createdAt: true,
});

export const insertBundleSchema = createInsertSchema(bundles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBundleJudgmentSchema = createInsertSchema(bundleJudgments).omit({
  id: true,
  addedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertBondSchema = createInsertSchema(bonds, {
  name: z.string().min(1, "Bond name is required"),
  faceValue: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .refine((v) => !Number.isNaN(v), "Face value must be a number"),
  bondScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  riskTier: z
    .enum(["low", "moderate", "high"])
    .optional()
    .nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBondDocumentSchema = createInsertSchema(bondDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertAuctionSchema = createInsertSchema(auctions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuctionBidSchema = createInsertSchema(auctionBids).omit({
  id: true,
  placedAt: true,
});

export const insertTrendingTopicSchema = createInsertSchema(trendingTopics).omit({
  id: true,
  fetchedAt: true,
});

export const insertTrendingSummarySchema = createInsertSchema(trendingSummaries).omit({
  id: true,
  createdAt: true,
});

export const insertUnderwritingCaseSchema = createInsertSchema(underwritingCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnderwritingPartySchema = createInsertSchema(underwritingParties).omit({
  id: true,
  createdAt: true,
});

// Surety insert schemas
export const insertSuretyTrustSchema = createInsertSchema(suretyTrusts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSuretyCaseSchema = createInsertSchema(suretyCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSuretyIndemnitorSchema = createInsertSchema(suretyIndemnitors).omit({
  id: true,
  createdAt: true,
});

export const insertSuretyCollateralSchema = createInsertSchema(suretyCollateral).omit({
  id: true,
  createdAt: true,
});

export const insertSuretyDocumentSchema = createInsertSchema(suretyDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertBondProcessDocumentSchema = createInsertSchema(bondProcessDocuments).omit({
  id: true,
  createdAt: true,
});

// Exchange settlement insert schemas
export const insertExchangeTradeSchema = createInsertSchema(exchangeTrades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExchangeSettlementSchema = createInsertSchema(exchangeSettlements).omit({
  id: true,
  createdAt: true,
});

export const insertBondAssignmentSchema = createInsertSchema(bondAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentTransferSchema = createInsertSchema(assignmentTransfers).omit({
  id: true,
  createdAt: true,
});

export const insertDistributionSchema = createInsertSchema(distributions).omit({
  id: true,
  createdAt: true,
});

export const insertLedgerAccountSchema = createInsertSchema(ledgerAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertLedgerJournalEntrySchema = createInsertSchema(ledgerJournalEntries).omit({
  id: true,
  createdAt: true,
});

export const insertLedgerPostingSchema = createInsertSchema(ledgerPostings).omit({
  id: true,
  createdAt: true,
});

export const insertImmutableEventSchema = createInsertSchema(immutableEvents).omit({
  id: true,
  createdAt: true,
});

export const insertStripeWebhookSchema = createInsertSchema(stripeWebhooks).omit({
  id: true,
  createdAt: true,
});

// ===== REAL DATA VALIDATION SCHEMAS =====
// These schemas enforce the "real data only" policy by requiring critical fields
// and rejecting requests with incomplete data instead of allowing null/undefined values.

// Judgment must have these fields for pricing analysis
export const pricingReadyJudgmentSchema = z.object({
  judgmentAmount: z.string()
    .min(1, "Judgment amount is required for pricing analysis")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Judgment amount must be a positive number",
    }),
  debtorName: z.string()
    .min(1, "Debtor name is required"),
  caseNumber: z.string()
    .min(1, "Case number is required"),
});

// Pricing request parameters must all be provided
export const pricingInputSchema = z.object({
  targetIRR: z.number()
    .min(0, "Target IRR must be non-negative")
    .max(100, "Target IRR must be less than 100%"),
  discountRate: z.number()
    .min(0, "Discount rate must be non-negative")
    .max(100, "Discount rate must be less than 100%"),
  expectedRecoveryPct: z.number()
    .min(0, "Expected recovery percentage must be non-negative")
    .max(100, "Expected recovery percentage cannot exceed 100%"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Judgment = typeof judgments.$inferSelect;
export type InsertJudgment = z.infer<typeof insertJudgmentSchema>;

export type RecoveryScore = typeof recoveryScores.$inferSelect;
export type InsertRecoveryScore = z.infer<typeof insertRecoveryScoreSchema>;

export type PriceEstimate = typeof priceEstimates.$inferSelect;
export type InsertPriceEstimate = z.infer<typeof insertPriceEstimateSchema>;

export type Bundle = typeof bundles.$inferSelect;
export type InsertBundle = z.infer<typeof insertBundleSchema>;

export type BundleJudgment = typeof bundleJudgments.$inferSelect;
export type InsertBundleJudgment = z.infer<typeof insertBundleJudgmentSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type Bond = typeof bonds.$inferSelect;
export type InsertBond = z.infer<typeof insertBondSchema>;

export type BondDocument = typeof bondDocuments.$inferSelect;
export type InsertBondDocument = z.infer<typeof insertBondDocumentSchema>;

export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = z.infer<typeof insertAuctionSchema>;

export type AuctionBid = typeof auctionBids.$inferSelect;
export type InsertAuctionBid = z.infer<typeof insertAuctionBidSchema>;

export type AuctionStatus = "PENDING" | "ACTIVE" | "RESERVE_MET" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export type TrendingTopic = typeof trendingTopics.$inferSelect;
export type InsertTrendingTopic = z.infer<typeof insertTrendingTopicSchema>;

export type TrendingSummary = typeof trendingSummaries.$inferSelect;
export type InsertTrendingSummary = z.infer<typeof insertTrendingSummarySchema>;

export type UnderwritingCase = typeof underwritingCases.$inferSelect;
export type InsertUnderwritingCase = z.infer<typeof insertUnderwritingCaseSchema>;

export type UnderwritingParty = typeof underwritingParties.$inferSelect;
export type InsertUnderwritingParty = z.infer<typeof insertUnderwritingPartySchema>;

// Surety types
export type SuretyTrust = typeof suretyTrusts.$inferSelect;
export type InsertSuretyTrust = z.infer<typeof insertSuretyTrustSchema>;

export type SuretyCase = typeof suretyCases.$inferSelect;
export type InsertSuretyCase = z.infer<typeof insertSuretyCaseSchema>;

export type SuretyIndemnitor = typeof suretyIndemnitors.$inferSelect;
export type InsertSuretyIndemnitor = z.infer<typeof insertSuretyIndemnitorSchema>;

export type SuretyCollateral = typeof suretyCollateral.$inferSelect;
export type InsertSuretyCollateral = z.infer<typeof insertSuretyCollateralSchema>;

export type SuretyDocument = typeof suretyDocuments.$inferSelect;
export type InsertSuretyDocument = z.infer<typeof insertSuretyDocumentSchema>;

export type BondProcessDocument = typeof bondProcessDocuments.$inferSelect;
export type InsertBondProcessDocument = z.infer<typeof insertBondProcessDocumentSchema>;

// Exchange settlement types
export type ExchangeTrade = typeof exchangeTrades.$inferSelect;
export type InsertExchangeTrade = z.infer<typeof insertExchangeTradeSchema>;

export type ExchangeSettlement = typeof exchangeSettlements.$inferSelect;
export type InsertExchangeSettlement = z.infer<typeof insertExchangeSettlementSchema>;

export type BondAssignment = typeof bondAssignments.$inferSelect;
export type InsertBondAssignment = z.infer<typeof insertBondAssignmentSchema>;

export type AssignmentTransfer = typeof assignmentTransfers.$inferSelect;
export type InsertAssignmentTransfer = z.infer<typeof insertAssignmentTransferSchema>;

export type Distribution = typeof distributions.$inferSelect;
export type InsertDistribution = z.infer<typeof insertDistributionSchema>;

export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type InsertLedgerAccount = z.infer<typeof insertLedgerAccountSchema>;

export type LedgerJournalEntry = typeof ledgerJournalEntries.$inferSelect;
export type InsertLedgerJournalEntry = z.infer<typeof insertLedgerJournalEntrySchema>;

export type LedgerPosting = typeof ledgerPostings.$inferSelect;
export type InsertLedgerPosting = z.infer<typeof insertLedgerPostingSchema>;

export type ImmutableEvent = typeof immutableEvents.$inferSelect;
export type InsertImmutableEvent = z.infer<typeof insertImmutableEventSchema>;

export type StripeWebhook = typeof stripeWebhooks.$inferSelect;
export type InsertStripeWebhook = z.infer<typeof insertStripeWebhookSchema>;

// Trade and assignment statuses
export type TradeStatus = "PENDING" | "PAID" | "SETTLED" | "FAILED" | "CANCELLED";
export type AssignmentStatus = "ACTIVE" | "TRANSFERRED" | "REVOKED";
export type TransferStatus = "PENDING" | "APPROVED" | "EXECUTED" | "REJECTED";
export type DistributionStatus = "PENDING" | "EXECUTED" | "CANCELLED";
export type SettlementStatus = "PENDING" | "COMPLETED" | "FAILED";

export type BondProcessStep = 
  | "JUDGMENT_TO_BOND"
  | "PERFECTION"
  | "SURETY_UNDERWRITING"
  | "SURETY_ACTIVATION"
  | "EXCHANGE_LISTING"
  | "EXCHANGE_SALE"
  | "TRUST_ALLOCATION";

export type BondDocType =
  | "BOND_TERM_SHEET"
  | "BOND_INSTRUMENT"
  | "PERFECTION_CERT"
  | "GIA"
  | "COLLATERAL_AGREEMENT"
  | "SURETY_TRUST_RESOLUTION"
  | "UNDERWRITING_REPORT"
  | "EXCHANGE_OFFERING_SHEET"
  | "INVESTOR_SUBSCRIPTION"
  | "TRADE_CONFIRMATION"
  | "TRUST_BOARD_MINUTES"
  | "TRUST_ALLOCATION_RESOLUTION";

export type SuretyCaseStatus = 
  | "DRAFT" 
  | "IN_REVIEW" 
  | "APPROVED" 
  | "DECLINED" 
  | "APPROVED_WITH_COLLATERAL" 
  | "DOCS_PENDING_SIGNATURE" 
  | "ACTIVE" 
  | "RELEASED";

export type SuretyUnderwritingDecision = "DECLINED" | "APPROVED" | "APPROVED_WITH_COLLATERAL";

// Additional types for API responses
export type PricingScenario = {
  scenario: "base" | "optimistic" | "stressed";
  targetIRR: number;
  discountRate: number;
  expectedRecoveryPct: number;
  judgmentAmount: number;
  expectedRecoveryAmount: number;
  recommendedPurchasePrice: number;
  note?: string;
};

export type JudgmentExtractionResult = {
  debtorName: string;
  caseNumber: string;
  court: string;
  jurisdiction: string;
  judgmentAmount: number;
  judgmentDate: string;
  confidence: number;
  rawFields?: Record<string, any>;
};

export type BundleWithJudgments = Bundle & {
  judgments: (BundleJudgment & { judgment: Judgment })[];
};

export type InvestorMetrics = {
  totalJudgments: number;
  totalFaceValue: number;
  totalRecommendedPurchase: number;
  averageRecovery: number;
  trancheBreakdown: {
    senior: { count: number; faceValue: number; recommendedPurchase: number };
    mezz: { count: number; faceValue: number; recommendedPurchase: number };
    equity: { count: number; faceValue: number; recommendedPurchase: number };
  };
};
