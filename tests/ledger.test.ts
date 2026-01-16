import { describe, it, expect, beforeEach } from "vitest";
import { 
  postJournalEntry, 
  getTrialBalance, 
  verifyLedgerIntegrity,
  ACCOUNT_CODES 
} from "../server/services/ledgerService";

describe("Ledger Service", () => {
  beforeEach(() => {
    // Reset ledger state between tests
  });

  it("should post balanced journal entry", async () => {
    const journalId = await postJournalEntry({
      type: "TEST_ENTRY",
      description: "Test journal entry",
      currency: "USD",
      lines: [
        {
          accountCode: ACCOUNT_CODES.CASH_STRIPE,
          debit: 1000,
          credit: 0,
          description: "Cash received",
        },
        {
          accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
          debit: 0,
          credit: 1000,
          description: "Investor payable",
        },
      ],
    });

    expect(journalId).toBeGreaterThan(0);
  });

  it("should throw error for unbalanced entry", async () => {
    await expect(async () => {
      await postJournalEntry({
        type: "UNBALANCED_ENTRY",
        description: "This should fail",
        currency: "USD",
        lines: [
          {
            accountCode: ACCOUNT_CODES.CASH_STRIPE,
            debit: 1000,
            credit: 0,
            description: "Cash received",
          },
          {
            accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
            debit: 0,
            credit: 500, // Unbalanced - should be 1000
            description: "Investor payable",
          },
        ],
      });
    }).rejects.toThrow("Unbalanced journal entry");
  });

  it("should get trial balance", async () => {
    // Post a test entry first
    await postJournalEntry({
      type: "TRIAL_BALANCE_TEST",
      description: "Test for trial balance",
      currency: "USD",
      lines: [
        {
          accountCode: ACCOUNT_CODES.CASH_STRIPE,
          debit: 5000,
          credit: 0,
          description: "Cash",
        },
        {
          accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
          debit: 0,
          credit: 5000,
          description: "Payable",
        },
      ],
    });

    const trialBalance = await getTrialBalance();

    expect(Array.isArray(trialBalance)).toBe(true);
    
    const cashAccount = trialBalance.find(t => t.accountCode === ACCOUNT_CODES.CASH_STRIPE);
    expect(cashAccount).toBeDefined();
    expect(cashAccount?.debit).toBe(5000);
  });

  it("should verify ledger integrity", async () => {
    // Post a valid entry
    await postJournalEntry({
      type: "INTEGRITY_TEST",
      description: "Test for integrity",
      currency: "USD",
      lines: [
        {
          accountCode: ACCOUNT_CODES.CASH_STRIPE,
          debit: 100,
          credit: 0,
          description: "Test debit",
        },
        {
          accountCode: ACCOUNT_CODES.RECOUPMENT_RESERVE,
          debit: 0,
          credit: 100,
          description: "Test credit",
        },
      ],
    });

    const verification = await verifyLedgerIntegrity();

    expect(verification.valid).toBe(true);
    expect(verification.issues.length).toBe(0);
  });
});
