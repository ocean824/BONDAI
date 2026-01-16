import crypto from "crypto";

export type ImmutableEventType =
  | "JUDGMENT_CREATED"
  | "JUDGMENT_EXTRACTED"
  | "BOND_CREATED"
  | "BOND_PERFECTED"
  | "AUCTION_CREATED"
  | "AUCTION_COMPLETED"
  | "TRADE_CREATED"
  | "TRADE_PAID"
  | "TRADE_SETTLED"
  | "TRADE_FAILED"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_TRANSFERRED"
  | "SURETY_UNDERWRITING_STARTED"
  | "SURETY_APPROVED"
  | "SURETY_DECLINED"
  | "SURETY_ACTIVATED"
  | "SURETY_RELEASED"
  | "COLLATERAL_POSTED"
  | "COLLATERAL_RELEASED"
  | "DOCUMENT_GENERATED"
  | "DOCUMENT_SIGNED"
  | "DISTRIBUTION_EXECUTED"
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "MEMBERSHIP_SUBSCRIBED"
  | "MEMBERSHIP_CANCELLED";

export interface ImmutableEventData {
  type: ImmutableEventType;
  actorId?: number;
  actorType: "USER" | "SYSTEM" | "ADMIN" | "API";
  entityType: string;
  entityId: number | string;
  payload: Record<string, unknown>;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

// In-memory event storage (replace with DB table in production)
interface EventRecord extends ImmutableEventData {
  id: number;
  eventHash: string;
  previousHash: string;
  timestamp: Date;
}

const events: EventRecord[] = [];
let eventIdCounter = 1;
let lastEventHash = "GENESIS";

export async function createImmutableEvent(data: ImmutableEventData): Promise<EventRecord> {
  const timestamp = new Date();
  
  // Create event content for hashing
  const eventContent = JSON.stringify({
    type: data.type,
    actorId: data.actorId,
    actorType: data.actorType,
    entityType: data.entityType,
    entityId: data.entityId,
    payload: data.payload,
    correlationId: data.correlationId,
    timestamp: timestamp.toISOString(),
    previousHash: lastEventHash,
  });

  // Calculate hash (SHA-256 for now, could use SHA-256 for stronger security)
  const eventHash = crypto
    .createHash("sha256")
    .update(eventContent)
    .digest("hex");

  const event: EventRecord = {
    id: eventIdCounter++,
    ...data,
    eventHash,
    previousHash: lastEventHash,
    timestamp,
  };

  events.push(event);
  lastEventHash = eventHash;

  console.log(`[ImmutableEvent] ${data.type} - ${eventHash.substring(0, 16)}...`);

  return event;
}

export async function getEventById(eventId: number): Promise<EventRecord | null> {
  return events.find((e) => e.id === eventId) || null;
}

export async function getEventsByEntity(
  entityType: string,
  entityId: number | string
): Promise<EventRecord[]> {
  return events.filter(
    (e) => e.entityType === entityType && e.entityId === entityId
  );
}

export async function getEventsByCorrelation(correlationId: string): Promise<EventRecord[]> {
  return events.filter((e) => e.correlationId === correlationId);
}

export async function getEventChain(): Promise<EventRecord[]> {
  return [...events];
}

export async function verifyEventChain(): Promise<{ valid: boolean; brokenAt?: number }> {
  for (let i = 1; i < events.length; i++) {
    const current = events[i];
    const previous = events[i - 1];

    // Verify hash chain
    const eventContent = JSON.stringify({
      type: current.type,
      actorId: current.actorId,
      actorType: current.actorType,
      entityType: current.entityType,
      entityId: current.entityId,
      payload: current.payload,
      correlationId: current.correlationId,
      timestamp: current.timestamp.toISOString(),
      previousHash: previous.eventHash,
    });

    const expectedHash = crypto
      .createHash("sha256")
      .update(eventContent)
      .digest("hex");

    if (current.eventHash !== expectedHash || current.previousHash !== previous.eventHash) {
      return { valid: false, brokenAt: current.id };
    }
  }

  return { valid: true };
}

export function generateEventHash(event: Omit<EventRecord, "id" | "eventHash" | "previousHash" | "timestamp">): string {
  const eventContent = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
    previousHash: lastEventHash,
  });

  return crypto
    .createHash("sha256")
    .update(eventContent)
    .digest("hex");
}
