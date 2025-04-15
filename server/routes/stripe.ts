// routes/stripe.ts

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '../../shared/tables';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Get the Stripe secret key from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set in the environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia', // Updated to latest API version
});

router.post('/create-stripe-account', async (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const { email, refreshUrl, returnUrl, orgId } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!refreshUrl || !returnUrl) {
    return res.status(400).json({ message: 'Refresh URL and Return URL are required' });
  }
  
  if (!orgId) {
    return res.status(400).json({ message: 'Organization ID is required' });
  }

  // Only organization owners can create Stripe accounts
  if (req.user.organizationId !== orgId || req.user.role !== "camp_creator") {
    return res.status(403).json({ message: "Not authorized for this organization" });
  }

  try {
    // 1. Create Express account (no tos_acceptance override!)
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    // 2. Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    // 3. Update the organization with the Stripe account ID
    await db.update(organizations)
      .set({
        stripeAccountId: account.id,
        stripeAccountStatus: 'pending',
        stripeAccountDetailsSubmitted: false,
        stripeAccountChargesEnabled: false,
        stripeAccountPayoutsEnabled: false,
      })
      .where(eq(organizations.id, orgId));

    // Return both the account ID and the onboarding URL
    return res.json({ 
      url: accountLink.url, 
      accountId: account.id 
    });
  } catch (error: any) {
    console.error('Stripe account creation failed:', error);
    
    // More detailed error logging for debugging
    if (error.type === 'StripeError') {
      console.error(`Stripe API Error Type: ${error.type}`);
      console.error(`Stripe Error Code: ${error.code}`);
      console.error(`Stripe Error Message: ${error.message}`);
      console.error(`Stripe Error Raw: ${JSON.stringify(error.raw || {})}`);
      
      if (error.raw && error.raw.param) {
        console.error(`Invalid parameter: ${error.raw.param}`);
      }
    }
    
    return res.status(500).json({ 
      message: 'Failed to create Stripe account', 
      error: error.message || 'Unknown error',
      code: error.code || null,
      param: error.raw?.param || null
    });
  }
});

export default router;