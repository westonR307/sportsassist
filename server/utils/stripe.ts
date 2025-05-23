import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '../../shared/tables';
import { eq } from 'drizzle-orm';
import { PLATFORM_FEE_PERCENTAGE, STRIPE_CONNECT } from '../constants';

// Check if Stripe API key is configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
if (!stripeSecretKey) {
  console.error('WARNING: STRIPE_SECRET_KEY environment variable is not set. Stripe functionality will not work.');
}

// Initialize Stripe with your secret key
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: STRIPE_CONNECT.API_VERSION, // Use API version from constants
});

// Calculate application fee amount based on base price
export const calculateApplicationFeeAmount = async (
  organizationId: number,
  basePrice: number
): Promise<number> => {
  try {
    // Get the organization to check if fee passthrough is enabled
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // If the organization doesn't have fee passthrough enabled, there's no application fee
    // (the organization is absorbing the fee)
    if (!org.stripeFeePassthrough) {
      return 0;
    }

    // Calculate application fee (platform percentage of the base price)
    const feePercentage = org.stripePlatformFeePercent !== null ? 
      Number(org.stripePlatformFeePercent) : PLATFORM_FEE_PERCENTAGE;
    
    // Convert to cents and round to nearest integer
    return Math.round((basePrice * feePercentage) / 100);
  } catch (error) {
    console.error('Error calculating application fee:', error);
    // Default to the standard fee percentage if there's an error
    return Math.round((basePrice * PLATFORM_FEE_PERCENTAGE) / 100);
  }
};

// Create a Stripe account link for onboarding
export const createStripeAccountLink = async (accountId: string, refreshUrl: string, returnUrl: string) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
};

// Create a new Stripe Connected account
export const createStripeConnectedAccount = async (email: string) => {
  try {
    console.log(`Creating Stripe Connect account for email: ${email}`);
    
    // Create the Connect account with simplified parameters as recommended
    const account = await stripe.accounts.create({
      type: STRIPE_CONNECT.ACCOUNT_TYPE,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true }, // Add card_payments capability
      },
      country: 'US',
      business_type: 'individual', // or 'company' if applicable
      email: email,
    });
    
    console.log(`Successfully created Stripe account with ID: ${account.id}`);
    return account;
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    throw error;
  }
};

// Retrieve a Stripe connected account
export const retrieveStripeAccount = async (accountId: string) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error('Error retrieving Stripe account:', error);
    throw error;
  }
};

// Create a login link for Stripe Express dashboard
export const createStripeDashboardLoginLink = async (accountId: string) => {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink;
  } catch (error) {
    console.error('Error creating Stripe dashboard login link:', error);
    throw error;
  }
};

// Update the organization's Stripe account status
export const updateOrganizationStripeStatus = async (
  organizationId: number, 
  stripeAccountId: string
) => {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    await db.update(organizations)
      .set({
        stripeAccountStatus: account.details_submitted ? 'active' : 'pending',
        stripeAccountDetailsSubmitted: account.details_submitted,
        stripeAccountChargesEnabled: account.charges_enabled,
        stripeAccountPayoutsEnabled: account.payouts_enabled,
      })
      .where(eq(organizations.id, organizationId));
      
    return account;
  } catch (error) {
    console.error('Error updating organization Stripe status:', error);
    throw error;
  }
};



// Create a checkout session for a camp registration
export const createCheckoutSession = async (
  campId: number,
  childId: number,
  organizationId: number,
  stripeAccountId: string,
  campPrice: number,
  campName: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
) => {
  try {
    // Calculate application fee if the organization has fee passthrough enabled
    const applicationFeeAmount = await calculateApplicationFeeAmount(organizationId, campPrice);
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Registration for ${campName}`,
            },
            unit_amount: campPrice, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      metadata: {
        ...metadata,
        campId: campId.toString(),
        childId: childId.toString(),
        organizationId: organizationId.toString(),
      },
    });
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};