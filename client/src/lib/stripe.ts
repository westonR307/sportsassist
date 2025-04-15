// Stripe utility functions for client-side usage
import { loadStripe } from '@stripe/stripe-js';

// Define the Stripe public key
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51QxbiOG0DcxZfNIWBeeZYt5dN6M0oDLUqzyMtAK6Kfgg8AC66RhUYnQ09a9L8PYNbgAsmMJfxyVZkOOokfGu82ma00WC3bXm0O';

// Initialize the Stripe promise
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

/**
 * Create a Stripe checkout session
 * @param {number} campId - ID of the camp
 * @param {number} childId - ID of the child being registered
 * @param {number} price - Price in cents
 * @param {boolean} passStripeFee - Whether to pass the Stripe fee to the customer
 * @returns {Promise<string>} - Checkout session ID
 */
export async function createCheckoutSession(campId: number, childId: number, price: number, passStripeFee: boolean) {
  const response = await fetch(`/api/checkout/create-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      campId,
      childId,
      price,
      passStripeFee,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to create checkout session');
  }

  const session = await response.json();
  return session.id;
}

/**
 * Redirect to Stripe Checkout
 * @param {string} sessionId - Checkout session ID
 */
export async function redirectToCheckout(sessionId: string) {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }
  
  const { error } = await stripe.redirectToCheckout({
    sessionId,
  });

  if (error) {
    console.error('Stripe redirect error:', error);
    throw new Error(error.message || 'Failed to redirect to checkout');
  }
}