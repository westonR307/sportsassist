# Stripe Connect Implementation for SportsAssist.io

## Overview

SportsAssist.io uses Stripe Connect to enable camp creators to receive payments directly from campers while allowing the platform to take a percentage fee for its services. This document outlines the implementation details of the Stripe Connect integration.

## Key Components

### Express Connect Accounts

- Camp creators register for Express Connect accounts through the platform
- Express accounts provide a streamlined onboarding experience while giving SportsAssist access to manage payouts
- The platform handles tax forms and compliance automatically
- Creators maintain control over their banking details and payout schedule

### Fee Structure

- The platform takes a percentage fee from each transaction
- Fees can be passed on to the camper or absorbed by the camp creator based on account settings
- Fee percentages are configurable per organization

### Payment Flow

1. Parent/camper completes registration form for a camp
2. Registration is created in pending status
3. Camper is redirected to Stripe Checkout with details of the camp
4. Payment is processed directly to the camp creator's Stripe Connect account with the platform fee automatically deducted
5. Stripe sends a webhook notification of the successful payment
6. The registration is marked as paid in the database

## Database Schema

The organizations table includes the following Stripe-related fields:

- `stripeAccountId`: The Stripe Connect account ID for the organization
- `stripeAccountStatus`: Current status of the Stripe account (pending, active, etc.)
- `stripeAccountDetailsSubmitted`: Whether the account details have been submitted
- `stripeAccountChargesEnabled`: Whether charges are enabled for the account
- `stripeAccountPayoutsEnabled`: Whether payouts are enabled for the account
- `stripeFeePassthrough`: Whether the platform fee is passed to the camper (true) or absorbed by the organization (false)
- `stripePlatformFeePercent`: The percentage fee that the platform takes from each transaction

The registrations table includes:

- `stripePaymentId`: The Stripe Checkout Session ID for the registration payment
- `paid`: Boolean indicating whether the registration has been paid for

## API Endpoints

### Organization Endpoints

- `POST /api/organizations/:orgId/stripe/create-account`: Creates a Stripe Connect account for an organization
- `POST /api/organizations/:orgId/stripe/create-account-link`: Creates an account link for onboarding
- `GET /api/organizations/:orgId/stripe/account-status`: Gets the status of a Stripe Connect account
- `PUT /api/organizations/:orgId/stripe/settings`: Updates Stripe-related settings for an organization

### Payment Endpoints

- `POST /api/camps/:campId/registrations/:registrationId/checkout`: Creates a checkout session for a registration
- `POST /api/stripe/webhook`: Webhook endpoint for Stripe events

## Implementation Files

- `server/utils/stripe.ts`: Contains utility functions for working with Stripe
- `server/routes.ts`: Contains the API endpoints for Stripe Connect
- `server/stripe-webhook.ts`: Handles Stripe webhook events
- `client/src/pages/stripe-connect-management.tsx`: UI for managing Stripe Connect accounts

## Security Considerations

- All Stripe account creation and management is done server-side
- The platform never stores or accesses sensitive payment details
- Stripe handles PCI compliance
- Webhook endpoints verify the Stripe signature to prevent tampering

## Testing

For testing, you can:

1. Create a test Stripe Connect account using the platform
2. Complete the onboarding process (test mode)
3. Create a camp and set a price
4. Register for the camp and complete a test payment
5. Verify that the payment was processed and the registration was marked as paid

## Error Handling

The implementation includes comprehensive error handling for:

- Account creation failures
- Payment processing failures
- Webhook verification failures
- Account status check failures

## Future Enhancements

Potential future enhancements include:

- Support for Stripe's Instant Payouts for camp creators
- Integration with Stripe's reporting API for improved financial reporting
- Support for recurring payments for camps with installment plans
- Automated refund processing for cancelled camps
