// routes/checkout.ts

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { organizations, camps } from '../../shared/tables';
import { eq } from 'drizzle-orm';
import { PLATFORM_FEE_PERCENTAGE, STRIPE_CONNECT } from '../constants';

const router = express.Router();

// Get the Stripe secret key from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set in the environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: STRIPE_CONNECT.API_VERSION, // Use API version from constants file
});

// Endpoint to create a Stripe checkout session
router.post('/create-session', async (req: Request, res: Response) => {
  try {
    const { campId, childId, price, passStripeFee } = req.body;

    if (!campId || !childId || !price) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get camp and organization details
    const camp = await db.query.camps.findFirst({
      where: eq(camps.id, campId),
    });

    if (!camp) {
      return res.status(404).json({ error: 'Camp not found' });
    }

    // Get organization details including Stripe account ID
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, camp.organizationId),
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if the organization has a connected Stripe account
    if (!organization.stripeAccountId) {
      return res.status(400).json({ 
        error: 'Organization does not have a connected Stripe account' 
      });
    }

    // Check if the Stripe account is ready to accept payments
    if (!organization.stripeAccountChargesEnabled) {
      return res.status(400).json({ 
        error: 'Organization\'s Stripe account is not yet enabled for charges. Please complete the Stripe onboarding process.' 
      });
    }

    // Calculate platform fee (10% of the price)
    const platformFeeAmount = Math.round(price * (PLATFORM_FEE_PERCENTAGE / 100));
    
    // Create metadata for the checkout session
    const metadata = {
      campId: campId.toString(),
      childId: childId.toString(),
      organizationId: organization.id.toString(),
      passStripeFee: passStripeFee ? 'true' : 'false',
    };

    // Create checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Registration for ${camp.name}`,
              description: camp.description || undefined,
            },
            unit_amount: price, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}${STRIPE_CONNECT.SUCCESS_URL}`,
      cancel_url: `${req.protocol}://${req.get('host')}${STRIPE_CONNECT.CANCEL_URL}`,
      metadata,
      payment_intent_data: {
        application_fee_amount: platformFeeAmount, // Platform fee in cents
        transfer_data: {
          destination: organization.stripeAccountId,
        },
      },
    };

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Return session ID to client
    return res.json({ id: session.id });
  } catch (error: any) {
    console.error('Stripe checkout session creation error:', error);
    
    // Enhanced error logging
    if (error.type === 'StripeError') {
      console.error(`Stripe API Error Type: ${error.type}`);
      console.error(`Stripe Error Code: ${error.code}`);
      console.error(`Stripe Error Message: ${error.message}`);
      
      if (error.raw) {
        console.error(`Stripe Error Raw: ${JSON.stringify(error.raw)}`);
      }
    }
    
    return res.status(500).json({ 
      error: 'Error creating checkout session', 
      message: error.message || 'Unknown error' 
    });
  }
});

// Handle Stripe webhook for successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set in the environment variables');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      stripeWebhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Process the successful payment (mark registration as paid, send confirmation email, etc.)
      if (session.metadata) {
        const campId = parseInt(session.metadata.campId);
        const childId = parseInt(session.metadata.childId);
        
        // Update registration status in the database
        try {
          // Process the payment and update registration status
          console.log(`Processing payment for camp ${campId} and child ${childId}`);
          
          try {
            // Import the required modules
            const { registrations } = require('../../shared/tables');
            const { and, eq } = require('drizzle-orm');
            
            // 1. Find the registration using campId and childId
            const existingRegistration = await db.query.registrations.findFirst({
              where: and(
                eq(registrations.campId, campId),
                eq(registrations.childId, childId)
              ),
            });
            
            if (!existingRegistration) {
              console.error(`Registration not found for camp ${campId} and child ${childId}`);
              return;
            }
            
            // 2. Update the paid status and store the Stripe payment ID
            await db.update(registrations)
              .set({ 
                paid: true,
                stripePaymentId: session.payment_intent as string
              })
              .where(
                and(
                  eq(registrations.campId, campId),
                  eq(registrations.childId, childId)
                )
              );
              
            console.log(`Successfully updated payment status for registration (camp: ${campId}, child: ${childId})`);
            
            // 3. Send email confirmation (implement this using your email service)
            // You could use your existing email service here
            try {
              // Import the email service module if it exists
              const { sendRegistrationConfirmationEmail } = require('../email-service');
              
              // Fetch necessary data for the email
              const camp = await db.query.camps.findFirst({
                where: eq(camps.id, campId),
              });
              
              const child = await db.query.children.findFirst({
                where: eq(children.id, childId),
              });
              
              if (camp && child) {
                // Use your existing email service to send confirmation
                await sendRegistrationConfirmationEmail(
                  child.parentId,
                  childId,
                  campId
                );
                console.log(`Sent payment confirmation email for registration (camp: ${campId}, child: ${childId})`);
              }
            } catch (emailError) {
              // Don't fail the entire process if email sending fails
              console.error('Error sending confirmation email:', emailError);
            }
            
          } catch (error) {
            console.error('Error updating registration payment status:', error);
          }
        } catch (error) {
          console.error('Error processing payment:', error);
        }
      }
      break;
      
    case 'payment_intent.succeeded':
      // Handle successful payment - this is useful for additional payment processing
      console.log('Payment succeeded:', event.data.object);
      break;
      
    case 'payment_intent.payment_failed':
      // Handle failed payment - you might want to notify the user
      console.log('Payment failed:', event.data.object);
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

export default router;