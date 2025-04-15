// routes/stripe.ts

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '../../shared/tables';
import { eq } from 'drizzle-orm';
import { STRIPE_CONNECT } from '../constants';

const router = express.Router();

// Get the Stripe keys from environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY || '';

if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not set in the environment variables');
}

if (!stripePublicKey) {
  console.error('STRIPE_PUBLIC_KEY is not set in the environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: STRIPE_CONNECT.API_VERSION, // Use API version from constants file
});

// Add a new endpoint to expose the public key to the client
router.get('/public-key', (req: Request, res: Response) => {
  res.json({ publicKey: stripePublicKey });
});

// Add a route to handle checking account status
router.get('/account-status/:orgId', async (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const orgId = parseInt(req.params.orgId);
  
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  // Ensure the user belongs to this organization or is an admin
  if (req.user.organizationId !== orgId && req.user.role !== "platform_admin") {
    return res.status(403).json({ message: "Not authorized for this organization" });
  }
  
  try {
    // Get the organization record
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    });
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }
    
    // If the organization doesn't have a Stripe account ID, return early
    if (!org.stripeAccountId) {
      return res.json({
        hasStripeAccount: false
      });
    }
    
    // Get the account details from Stripe
    const account = await stripe.accounts.retrieve(org.stripeAccountId);
    
    // Return the relevant info
    return res.json({
      hasStripeAccount: true,
      accountId: org.stripeAccountId,
      status: account.details_submitted ? 'completed' : 'pending',
      detailsSubmitted: !!account.details_submitted,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      requirements: account.requirements || {}
    });
  } catch (error: any) {
    console.error(`Error retrieving Stripe account status for org ${orgId}:`, error);
    
    if (error.type === 'StripeError' && error.statusCode === 404) {
      // Account no longer exists at Stripe, clear the account ID
      try {
        await db.update(organizations)
          .set({
            stripeAccountId: null,
            stripeAccountStatus: null,
            stripeAccountDetailsSubmitted: false,
            stripeAccountChargesEnabled: false,
            stripeAccountPayoutsEnabled: false,
          })
          .where(eq(organizations.id, orgId));
      } catch (dbError) {
        console.error('Error clearing invalid Stripe account reference:', dbError);
      }
      
      return res.json({
        hasStripeAccount: false,
        error: 'Stripe account was removed or is invalid'
      });
    }
    
    if (!stripeSecretKey) {
      return res.status(500).json({
        error: "Stripe is not properly configured. Please contact the platform administrator."
      });
    }
    
    return res.status(500).json({
      error: 'Failed to retrieve Stripe account status',
      message: error.message
    });
  }
});

// Add a route to force refresh account status
router.post('/account-status/:orgId/refresh', async (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const orgId = parseInt(req.params.orgId);
  
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  // Ensure the user belongs to this organization or is an admin
  if (req.user.organizationId !== orgId && req.user.role !== "platform_admin") {
    return res.status(403).json({ message: "Not authorized for this organization" });
  }
  
  try {
    // Get the organization record
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    });
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }
    
    // If the organization doesn't have a Stripe account ID, return early
    if (!org.stripeAccountId) {
      return res.json({
        hasStripeAccount: false,
        message: "No Stripe account associated with this organization"
      });
    }
    
    console.log(`Force refreshing Stripe account status for org ${orgId}, account ${org.stripeAccountId}`);
    
    // Get the latest account details from Stripe
    const account = await stripe.accounts.retrieve(org.stripeAccountId);
    
    // Update the organization with the latest account status
    await db.update(organizations)
      .set({
        stripeAccountStatus: account.details_submitted ? 'active' : 'pending',
        stripeAccountDetailsSubmitted: !!account.details_submitted,
        stripeAccountChargesEnabled: !!account.charges_enabled,
        stripeAccountPayoutsEnabled: !!account.payouts_enabled,
      })
      .where(eq(organizations.id, orgId));
    
    // Return success along with the latest status
    return res.json({
      success: true,
      hasStripeAccount: true,
      accountId: org.stripeAccountId,
      status: account.details_submitted ? 'completed' : 'pending',
      detailsSubmitted: !!account.details_submitted,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      requirements: account.requirements || {},
      message: "Account status refreshed successfully"
    });
  } catch (error: any) {
    console.error(`Error refreshing Stripe account status for org ${orgId}:`, error);
    
    if (error.type === 'StripeError' && error.statusCode === 404) {
      // Account no longer exists at Stripe, clear the account ID
      try {
        await db.update(organizations)
          .set({
            stripeAccountId: null,
            stripeAccountStatus: null,
            stripeAccountDetailsSubmitted: false,
            stripeAccountChargesEnabled: false,
            stripeAccountPayoutsEnabled: false,
          })
          .where(eq(organizations.id, orgId));
          
        return res.json({
          success: false,
          hasStripeAccount: false,
          message: "Stripe account was removed or is invalid. Organization record updated."
        });
      } catch (dbError) {
        console.error('Error clearing invalid Stripe account reference:', dbError);
        return res.status(500).json({
          success: false,
          error: "Database error while updating organization record"
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh account status',
      message: error.message
    });
  }
});

// Add a route to handle account status callback
router.get('/account-status-callback', async (req: Request, res: Response) => {
  // This is a simple callback endpoint that just confirms the return from Stripe
  // The front-end will get the actual status via the /account-status endpoint
  res.redirect('/settings/payment?callback=true');
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
    // Check if the organization already has a Stripe account
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    });
    
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }
    
    // If account exists, we'll generate a new onboarding link instead
    if (org.stripeAccountId) {
      try {
        // Verify the account still exists at Stripe
        const account = await stripe.accounts.retrieve(org.stripeAccountId);
        
        // If the account exists, generate a new onboarding link
        const accountLink = await stripe.accountLinks.create({
          account: org.stripeAccountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: 'account_onboarding',
        });
        
        return res.json({ 
          url: accountLink.url, 
          accountId: org.stripeAccountId 
        });
      } catch (accountError: any) {
        // If we got a 404 from Stripe, the account doesn't exist anymore
        if (accountError.statusCode === 404) {
          console.log(`Stripe account ${org.stripeAccountId} no longer exists, creating a new one.`);
          // We'll continue with creating a new account below
        } else {
          throw accountError; // rethrow any other error
        }
      }
    }

    // 1. Create Express account (no tos_acceptance override!)
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
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

// Add routes for creating Stripe Express dashboard and account links
router.post('/organizations/:orgId/dashboard-link', async (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const orgId = parseInt(req.params.orgId);
  
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  if (req.user.organizationId !== orgId && req.user.role !== "platform_admin") {
    return res.status(403).json({ message: "Not authorized for this organization" });
  }
  
  try {
    // Get the organization record
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    });
    
    if (!org || !org.stripeAccountId) {
      return res.status(404).json({ message: "Stripe account not found for this organization" });
    }
    
    // Create a login link for the user to access their Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      org.stripeAccountId
    );
    
    return res.json({ url: loginLink.url });
  } catch (error: any) {
    console.error('Error creating Stripe dashboard link:', error);
    
    if (error.type === 'StripeError' && error.statusCode === 404) {
      return res.status(404).json({
        message: "This Stripe account no longer exists. Please create a new one."
      });
    }
    
    return res.status(500).json({
      message: "Failed to create Stripe dashboard link",
      error: error.message
    });
  }
});

router.post('/organizations/:orgId/create-account-link', async (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const { refreshUrl, returnUrl } = req.body;
  const orgId = parseInt(req.params.orgId);
  
  if (isNaN(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }
  
  if (!refreshUrl || !returnUrl) {
    return res.status(400).json({ message: 'Refresh URL and Return URL are required' });
  }
  
  if (req.user.organizationId !== orgId && req.user.role !== "platform_admin") {
    return res.status(403).json({ message: "Not authorized for this organization" });
  }
  
  try {
    // Get the organization record
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    });
    
    if (!org || !org.stripeAccountId) {
      return res.status(404).json({ message: "Stripe account not found for this organization" });
    }
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: org.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Error creating Stripe account link:', error);
    
    if (error.type === 'StripeError' && error.statusCode === 404) {
      return res.status(404).json({
        message: "This Stripe account no longer exists. Please create a new one."
      });
    }
    
    return res.status(500).json({
      message: "Failed to create Stripe account link",
      error: error.message
    });
  }
});

export default router;