# SportsAssist.io Technical Documentation

This directory contains technical documentation for the SportsAssist.io platform.

## Table of Contents

### Stripe Integrations
- [Stripe Connect Implementation](./stripe-connect-implementation.md) - Overview of the Stripe Connect integration
- [Stripe Webhook Setup](./stripe-webhook-setup.md) - Details on webhook implementation for Stripe events

## Getting Started

To get started with development, follow these steps:

1. Clone the repository
2. Set up the required environment variables (see Environment Variables section)
3. Start the application with the workflow "Start application"

## Environment Variables

The following environment variables are required for the application to function properly:

- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret from Stripe Dashboard

## Architecture

SportsAssist.io follows a modern web application architecture:

- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL with Drizzle ORM
- Authentication: Passport.js with session-based authentication
- Payment Processing: Stripe Connect

## Key Features

- Camp Management: Create, update, and manage sports camps
- Registration System: Allow athletes to register for camps
- Permission Management: Control access with custom permissions
- Payment Processing: Collect payments with Stripe Connect
- Schedule Management: Create and manage camp schedules
