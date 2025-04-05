# Stripe Connect Platform Setup Guide

## Overview

This document provides instructions for platform administrators to properly configure the Stripe Connect platform settings to enable camp creators to connect their Stripe accounts.

## Required Platform Setup

### 1. Set up the Stripe Platform Profile

Before connected accounts (camp creators) can be created, the platform must complete its Connect platform profile. This requires:

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Settings → Connect settings → Platform profile**
3. Complete the following sections:
   - Platform type
   - Platform website URL
   - Platform business details
   - Platform services description
   - Responsibilities for managing losses

### 2. Responsibilities for Managing Losses

This is a critical section that is required by Stripe. You must specify whether the platform or the connected accounts are responsible for different types of losses:

- **Platform is responsible**: The platform handles fraud, disputes, and other issues
- **Connected accounts are responsible**: Each business connected to the platform handles their own issues

For SportsAssist:
- We recommend setting the connected accounts (camp creators) as responsible for disputes and fraud
- This matches our implementation using the `service_agreement: 'recipient'` option

### 3. API Version

The platform is using Stripe API version `2022-11-15`. Ensure your Stripe account is compatible with this API version.

### 4. Webhook Setup

Ensure the following webhooks are configured properly:

- `checkout.session.completed`: For tracking successful payments
- `account.updated`: For tracking updates to connected accounts

## Technical Implementation

Our implementation uses Stripe Connect with Express accounts with the following setup:

```typescript
// Create a Connect account with recipient service agreement
const account = await stripe.accounts.create({
  type: 'express',
  email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_profile: {
    mcc: '8299', // Educational Services
    url: 'https://sportsassist.io',
    product_description: 'Sports camp registration and management platform',
  },
  tos_acceptance: {
    service_agreement: 'recipient', // Connected accounts are responsible for disputes
  }
});
```

## Common Issues and Troubleshooting

### "Please review the responsibilities of managing losses"

This error occurs when the platform hasn't completed the Connect platform profile setup. The solution is:

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Settings → Connect settings → Platform profile**
3. Complete the "Responsibilities for managing losses" section
4. Save your changes

### API Key Issues

Ensure the proper Stripe API key is set as an environment variable:
- For production: Use the live secret key
- For development: Use the test secret key

## Support Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Connect Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Stripe Connect Handling Disputes](https://stripe.com/docs/connect/handling-disputes)
