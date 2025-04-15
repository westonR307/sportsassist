// Stripe utility functions for client-side usage
import { loadStripe } from '@stripe/stripe-js';

// Fetch the Stripe public key from the server
// This is more secure than hardcoding it in the client
async function getStripePublicKey() {
  try {
    const response = await fetch('/api/stripe/public-key');
    if (!response.ok) {
      throw new Error('Failed to fetch Stripe public key');
    }
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Error fetching Stripe public key:', error);
    // Fallback to the environment variable if available
    return import.meta.env.VITE_STRIPE_PUBLIC_KEY || null;
  }
}

// Create a function to initialize Stripe asynchronously
let stripePromiseInstance = null;

export const getStripePromise = async () => {
  if (stripePromiseInstance) {
    return stripePromiseInstance;
  }
  
  const publicKey = await getStripePublicKey();
  if (!publicKey) {
    throw new Error('Stripe public key not available');
  }
  
  stripePromiseInstance = loadStripe(publicKey);
  return stripePromiseInstance;
};

// For backward compatibility with existing code
export const stripePromise = getStripePromise();

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
  try {
    const stripe = await getStripePromise();
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
  } catch (error) {
    console.error('Error in redirectToCheckout:', error);
    throw error;
  }
}