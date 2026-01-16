import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Store webhook secrets by UUID
const webhookSecrets: Map<string, string> = new Map();

export function setWebhookSecret(uuid: string, secret: string) {
  webhookSecrets.set(uuid, secret);
  console.log(`Webhook secret stored for UUID: ${uuid}`);
}

export function getWebhookSecret(uuid: string): string | undefined {
  return webhookSecrets.get(uuid);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Process through stripe-replit-sync for data synchronization
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);
    
    // Also process custom subscription updates
    const secret = getWebhookSecret(uuid);
    if (secret) {
      try {
        const stripe = await getUncachableStripeClient();
        const event = stripe.webhooks.constructEvent(payload, signature, secret);
        await WebhookHandlers.handleStripeEvent(event);
      } catch (err: any) {
        console.error('Error processing subscription event:', err.message);
      }
    } else {
      // If no secret stored, try to parse the event directly (less secure but functional)
      try {
        const eventData = JSON.parse(payload.toString());
        await WebhookHandlers.handleStripeEvent(eventData);
      } catch (err: any) {
        console.error('Error parsing webhook event:', err.message);
      }
    }
  }

  static async handleStripeEvent(event: any): Promise<void> {
    console.log(`Processing Stripe event: ${event.type}`);
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
        break;
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await WebhookHandlers.handleInvoicePaymentSucceeded(event.data.object);
        break;
      default:
        break;
    }
  }

  static async handleSubscriptionChange(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const tier = subscription.metadata?.tier;

    console.log(`Subscription ${status} for customer ${customerId}`);

    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));

    if (user) {
      await db.update(users)
        .set({
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: status,
          subscriptionTier: tier || user.subscriptionTier
        })
        .where(eq(users.id, user.id));
      
      console.log(`Updated user ${user.id} subscription: ${status} (${tier})`);
    } else {
      console.warn(`No user found for customer ${customerId}`);
    }
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));

    if (user) {
      await db.update(users)
        .set({
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null
        })
        .where(eq(users.id, user.id));
      
      console.log(`Canceled subscription for user ${user.id}`);
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    const purpose = session.metadata?.purpose;
    const tradeId = session.metadata?.tradeId;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    // Handle bond purchase checkout completion
    if (purpose === "bond_purchase" && tradeId) {
      console.log(`Bond purchase checkout completed for trade ${tradeId}`);

      try {
        const { updateTradeStatus, createSettlement } = await import('./services/tradeService');
        const { getTradeById } = await import('./services/tradeService');
        const { db } = await import('./db');
        const { users, bonds } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');

        // Update trade status to PAID
        await updateTradeStatus(parseInt(tradeId), "PAID", {
          paymentIntentId: session.payment_intent
        });

        const trade = await getTradeById(parseInt(tradeId));
        if (!trade) {
          console.error(`Trade ${tradeId} not found`);
          return;
        }

        // Get investor and bond details for settlement
        const [investor] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, trade.investorId));

        const [bond] = await db
          .select({ name: bonds.name })
          .from(bonds)
          .where(eq(bonds.id, trade.bondId));

        // Create settlement with ledger entries
        const settlement = await createSettlement(
          parseInt(tradeId),
          investor?.email || "",
          investor?.name || "",
          bond?.name || ""
        );

        console.log(`Trade ${tradeId} settled:`, settlement);
        return;
      } catch (error) {
        console.error(`Error processing bond purchase settlement for trade ${tradeId}:`, error);
        throw error; // Re-throw to trigger webhook retry
      }
    }

    // Handle subscription checkout completion
    if (userId && tier) {
      console.log(`Checkout completed for user ${userId} - tier: ${tier}`);
      
      await db.update(users)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          subscriptionTier: tier
        })
        .where(eq(users.id, parseInt(userId)));
      
      console.log(`Updated user ${userId} to active ${tier} subscription`);
    }
  }

  static async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) return;

    // Find user and ensure subscription is active
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));

    if (user && user.subscriptionStatus !== 'active') {
      await db.update(users)
        .set({
          subscriptionStatus: 'active',
          stripeSubscriptionId: subscriptionId
        })
        .where(eq(users.id, user.id));
      
      console.log(`Activated subscription for user ${user.id} after payment`);
    }
  }
}
