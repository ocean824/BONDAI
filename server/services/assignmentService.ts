import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { bondAssignments, assignmentTransfers, bonds, exchangeTrades, users } from "@shared/schema";
import { createImmutableEvent, type ImmutableEventType } from "./immutableEventService";
import { postJournalEntry, ACCOUNT_CODES } from "./ledgerService";

export interface AssignmentData {
  tradeId: number;
  bondId: number;
  investorId: number;
  amount: string;
  faceValue: string;
  bondName: string;
}

export interface TransferData {
  assignmentId: number;
  fromInvestorId: number;
  toInvestorId: number;
  transferPercent: number;
  transferAmount: number;
}

// Create assignment when trade is settled
export async function createAssignment(data: AssignmentData): Promise<typeof bondAssignments.$inferSelect | null> {
  const [assignment] = await db.insert(bondAssignments).values({
    tradeId: data.tradeId,
    bondId: data.bondId,
    investorId: data.investorId,
    ownershipPercent: "100", // 100% for initial assignment
    faceValueAmount: data.faceValue,
    status: "ACTIVE",
    transferable: true,
  }).returning();

  // Create immutable event
  await createImmutableEvent({
    type: "ASSIGNMENT_CREATED" as ImmutableEventType,
    actorId: data.investorId,
    actorType: "USER",
    entityType: "BOND_ASSIGNMENT",
    entityId: assignment.id,
    payload: {
      assignmentId: assignment.id,
      bondId: data.bondId,
      bondName: data.bondName,
      investorId: data.investorId,
      ownershipPercent: 100,
      faceValue: data.faceValue,
    },
    correlationId: `assignment-${assignment.id}`,
  });

  // Create ledger entry for ownership transfer
  await postJournalEntry({
    type: "ASSIGNMENT_CREATED",
    description: `Initial assignment of bond ${data.bondName} to investor`,
    currency: "USD",
    lines: [
      {
        accountCode: ACCOUNT_CODES.ISSUER_PAYABLE,
        debit: parseFloat(data.amount),
        credit: 0,
        description: "Bond issuance - liability to investor",
      },
      {
        accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
        debit: 0,
        credit: parseFloat(data.amount),
        description: "Bond assigned to investor",
      },
    ],
    metadata: {
      assignmentId: assignment.id,
      bondId: data.bondId,
      investorId: data.investorId,
    },
  });

  return assignment;
}

// Get cap table for a bond - all owners and their percentages
export async function getCapTable(bondId: number): Promise<{
  bondId: number;
  totalFaceValue: number;
  owners: {
    investorId: number;
    investorName: string;
    investorEmail: string;
    ownershipPercent: number;
    faceValueAmount: number;
    assignmentId: number;
    status: string;
  }[];
} | null> {
  const [bond] = await db.select().from(bonds).where(eq(bonds.id, bondId));
  if (!bond) return null;

  const assignments = await db
    .select({
      id: bondAssignments.id,
      investorId: bondAssignments.investorId,
      ownershipPercent: bondAssignments.ownershipPercent,
      faceValueAmount: bondAssignments.faceValueAmount,
      status: bondAssignments.status,
      name: users.name,
      email: users.email,
    })
    .from(bondAssignments)
    .innerJoin(users, eq(bondAssignments.investorId, users.id))
    .where(and(
      eq(bondAssignments.bondId, bondId),
      eq(bondAssignments.status, "ACTIVE")
    ));

  const totalFaceValue = assignments.reduce(
    (sum, a) => sum + parseFloat(String(a.faceValueAmount)),
    0
  );

  return {
    bondId,
    totalFaceValue,
    owners: assignments.map(a => ({
      investorId: a.investorId,
      investorName: a.name || "",
      investorEmail: a.email || "",
      ownershipPercent: parseFloat(String(a.ownershipPercent)),
      faceValueAmount: parseFloat(String(a.faceValueAmount)),
      assignmentId: a.id,
      status: a.status,
    })),
  };
}

// Get investor's bond holdings
export async function getInvestorHoldings(investorId: number): Promise<{
  bondId: number;
  bondName: string;
  faceValue: number;
  ownershipPercent: number;
  assignmentId: number;
  status: string;
  isTransferable: boolean;
}[]> {
  const holdings = await db
    .select({
      bondId: bondAssignments.bondId,
      bondName: bonds.name,
      faceValue: bondAssignments.faceValueAmount,
      ownershipPercent: bondAssignments.ownershipPercent,
      assignmentId: bondAssignments.id,
      status: bondAssignments.status,
      transferable: bondAssignments.transferable,
    })
    .from(bondAssignments)
    .innerJoin(bonds, eq(bondAssignments.bondId, bonds.id))
    .where(and(
      eq(bondAssignments.investorId, investorId),
      eq(bondAssignments.status, "ACTIVE")
    ));

  return holdings.map(h => ({
    bondId: h.bondId,
    bondName: h.bondName || "",
    faceValue: parseFloat(String(h.faceValue)),
    ownershipPercent: parseFloat(String(h.ownershipPercent)),
    assignmentId: h.assignmentId,
    status: h.status,
    isTransferable: h.transferable,
  }));
}

// Request a transfer of assignment
export async function requestTransfer(data: TransferData): Promise<typeof assignmentTransfers.$inferSelect | null> {
  // Verify assignment exists and is transferable
  const [assignment] = await db
    .select()
    .from(bondAssignments)
    .where(eq(bondAssignments.id, data.assignmentId));

  if (!assignment || assignment.status !== "ACTIVE" || !assignment.transferable) {
    throw new Error("Assignment is not available for transfer");
  }

  // Verify fromInvestor owns the assignment
  if (assignment.investorId !== data.fromInvestorId) {
    throw new Error("You do not own this assignment");
  }

  // Create transfer request
  const [transfer] = await db.insert(assignmentTransfers).values({
    assignmentId: data.assignmentId,
    fromInvestorId: data.fromInvestorId,
    toInvestorId: data.toInvestorId,
    transferPercent: String(data.transferPercent),
    transferAmount: String(data.transferAmount),
    status: "PENDING",
  }).returning();

  // Create immutable event
  await createImmutableEvent({
    type: "ASSIGNMENT_TRANSFERRED" as ImmutableEventType,
    actorId: data.fromInvestorId,
    actorType: "USER",
    entityType: "ASSIGNMENT_TRANSFER",
    entityId: transfer.id,
    payload: {
      transferId: transfer.id,
      assignmentId: data.assignmentId,
      fromInvestorId: data.fromInvestorId,
      toInvestorId: data.toInvestorId,
      transferPercent: data.transferPercent,
      transferAmount: data.transferAmount,
    },
    correlationId: `transfer-${transfer.id}`,
  });

  return transfer;
}

// Approve and execute a transfer
export async function executeTransfer(transferId: number): Promise<boolean> {
  const [transfer] = await db
    .select()
    .from(assignmentTransfers)
    .where(eq(assignmentTransfers.id, transferId));

  if (!transfer || transfer.status !== "PENDING") {
    return false;
  }

  // Update transfer status
  await db
    .update(assignmentTransfers)
    .set({
      status: "EXECUTED",
      executedAt: new Date(),
    })
    .where(eq(assignmentTransfers.id, transferId));

  // Update original assignment - reduce percentage and amount
  const [originalAssignment] = await db
    .select()
    .from(bondAssignments)
    .where(eq(bondAssignments.id, transfer.assignmentId));

  if (!originalAssignment) return false;

  const remainingPercent = parseFloat(String(originalAssignment.ownershipPercent)) - parseFloat(String(transfer.transferPercent));
  const remainingAmount = parseFloat(String(originalAssignment.faceValueAmount)) - parseFloat(String(transfer.transferAmount));

  await db
    .update(bondAssignments)
    .set({
      ownershipPercent: String(remainingPercent),
      faceValueAmount: String(remainingAmount),
    })
    .where(eq(bondAssignments.id, transfer.assignmentId));

  // Create new assignment for receiving investor
  await db.insert(bondAssignments).values({
    tradeId: originalAssignment.tradeId,
    bondId: originalAssignment.bondId,
    investorId: transfer.toInvestorId,
    ownershipPercent: transfer.transferPercent,
    faceValueAmount: transfer.transferAmount,
    status: "ACTIVE",
    transferable: originalAssignment.transferable,
  });

  // Create ledger entry for transfer
  await postJournalEntry({
    type: "ASSIGNMENT_TRANSFER",
    description: `Transfer of bond assignment to new investor`,
    currency: "USD",
    lines: [
      {
        accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
        debit: parseFloat(String(transfer.transferAmount)),
        credit: 0,
        description: "Transfer from original investor",
      },
      {
        accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
        debit: 0,
        credit: parseFloat(String(transfer.transferAmount)),
        description: "Transfer to new investor",
      },
    ],
    metadata: {
      transferId,
      assignmentId: transfer.assignmentId,
      fromInvestorId: transfer.fromInvestorId,
      toInvestorId: transfer.toInvestorId,
    },
  });

  return true;
}

// Get pending transfers for an investor
export async function getPendingTransfers(investorId: number): Promise<typeof assignmentTransfers.$inferSelect[]> {
  const transfers = await db
    .select()
    .from(assignmentTransfers)
    .where(and(
      eq(assignmentTransfers.toInvestorId, investorId),
      eq(assignmentTransfers.status, "PENDING")
    ))
    .orderBy(desc(assignmentTransfers.createdAt));

  return transfers;
}

// Get transfer history
export async function getTransferHistory(assignmentId: number): Promise<typeof assignmentTransfers.$inferSelect[]> {
  const transfers = await db
    .select()
    .from(assignmentTransfers)
    .where(eq(assignmentTransfers.assignmentId, assignmentId))
    .orderBy(desc(assignmentTransfers.createdAt));

  return transfers;
}
