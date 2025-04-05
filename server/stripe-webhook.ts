import { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { registrations, organizations } from '../shared/tables';

// Initialize Stripe with your secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15', // Match the version used in stripe.ts
});

// Your webhook secret from the Stripe dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error('Webhook Error: No Stripe signature found');
    return res.status(400).send('No Stripe signature found');
  }

  let event: Stripe.Event;

  try {
    // Verify the event is from Stripe
    if (endpointSecret) {
      // If we have an endpoint secret, verify the signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret
      );
    } else {
      // If we don't have an endpoint secret, just parse the event
      // This is less secure but allows for development testing
      console.warn('Webhook Warning: No endpoint secret configured');
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event based on its type
  try {
    const eventType = event.type;
    console.log(`Processing webhook event: ${eventType}`);

    switch (eventType) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      
      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(failedPaymentIntent);
        break;

      // Handle other event types as needed
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Error processing webhook');
  }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed', session.id);
  
  // Find the registration associated with this checkout session
  if (session.metadata?.registrationId) {
    const registrationId = parseInt(session.metadata.registrationId);
    
    try {
      // Update the registration to mark it as paid
      await db.update(registrations)
        .set({
          paid: true,
        })
        .where(eq(registrations.id, registrationId));
      
      console.log(`Registration ${registrationId} marked as paid`);
    } catch (error) {
      console.error(`Error updating registration ${registrationId}:`, error);
    }
  } else {
    console.warn('No registration ID found in checkout session metadata');
  }
}

// Handle account.updated event
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`Account updated: ${account.id}`);
  
  try {
    // Find the organization with this Stripe account ID
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.stripeAccountId, account.id))
      .then(results => results[0]);
    
    if (organization) {
      // Import the updateOrganizationStripeStatus function
      const { updateOrganizationStripeStatus } = await import('./utils/stripe');
      
      // Update the status using the existing function
      await updateOrganizationStripeStatus(organization.id, account.id);
      console.log(`Updated organization ${organization.id} Stripe status via webhook`);
    } else {
      console.warn(`No organization found with Stripe account ID: ${account.id}`);
    }
  } catch (error) {
    console.error(`Error updating organization for Stripe account ${account.id}:`, error);
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  
  // You could record the successful payment or update application state
}

// Handle payment_intent.payment_failed event
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment failed: ${paymentIntent.id}`);
  
  // You could handle failed payments here, such as notifying the user
  // or updating the application state
}