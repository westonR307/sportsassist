# Stripe Webhook Integration

## Overview

This document outlines the Stripe webhook integration for the SportsAssist.io platform. Webhooks allow our application to receive real-time event notifications from Stripe, such as when a payment is completed or when a connected account is updated.

## Webhook Endpoint

The webhook endpoint is set up at:

```
/api/stripe/webhook
```

This endpoint is configured to process various Stripe events and update our database accordingly.

## Supported Events

The webhook handler supports the following events:

1. **checkout.session.completed** - Triggered when a checkout session is completed successfully
   - Updates registration status to "paid" in the database

2. **account.updated** - Triggered when a connected account's details are updated
   - Updates organization's Stripe account status in the database

3. **payment_intent.succeeded** - Triggered when a payment is successfully processed
   - Currently logs the event, can be extended to update payment records

4. **payment_intent.payment_failed** - Triggered when a payment attempt fails
   - Currently logs the event, can be extended to handle payment failures

## Implementation

The webhook handler is implemented in `server/stripe-webhook.ts`. It:

1. Verifies the Stripe signature to ensure the webhook is coming from Stripe
2. Parses the event and routes it to the appropriate handler function
3. Updates the database based on the event type

## Configuration 

### Required Environment Variables

- `STRIPE_SECRET_KEY` - Your Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` - The webhook signing secret from the Stripe dashboard

### Setting Up in Stripe Dashboard

1. Log in to the Stripe Dashboard
2. Go to Developers > Webhooks
3. Click "Add Endpoint"
4. Enter your webhook URL (e.g., `https://your-domain.com/api/stripe/webhook`)
5. Select the events you want to receive:
   - `checkout.session.completed`
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Save the endpoint
7. Copy the Signing Secret and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

### Testing Webhooks

For local development, you can use the Stripe CLI to forward webhook events to your local environment:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

This will provide a webhook secret that you can use temporarily in your environment.

## Security Considerations

- The webhook endpoint uses Stripe's signature verification to ensure the webhook is coming from Stripe
- The endpoint only processes events that we have explicitly coded handlers for
- For maximum security, always use HTTPS in production environments

## Error Handling

The webhook handler includes comprehensive error handling:

- Logs detailed error information for debugging
- Returns appropriate HTTP status codes (200 for success, 400 for validation errors, 500 for server errors)
- Continues processing other events even if one event handler fails

## Extending the Webhook

To add support for additional Stripe events:

1. Add a case for the new event type in the switch statement in `handleStripeWebhook`
2. Create a handler function for the new event type
3. Add the new event to your webhook configuration in the Stripe Dashboard

## Troubleshooting

Common issues:

1. **Webhook not receiving events** - Verify that the webhook endpoint is correctly configured in the Stripe Dashboard
2. **Signature verification failed** - Ensure that the `STRIPE_WEBHOOK_SECRET` environment variable is set correctly
3. **Events not being processed** - Check the logs for detailed error information

## Related Files

- `server/stripe-webhook.ts` - Main webhook handler implementation
- `server/utils/stripe.ts` - Stripe utility functions
- `server/routes.ts` - Route registration for the webhook endpoint
