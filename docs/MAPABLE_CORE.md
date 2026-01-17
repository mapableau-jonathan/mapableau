# MapAble Core Foundation

MapAble Core is the foundational infrastructure that provides unified account management, centralized billing, cross-application messaging, and a unified support center for all MapAble services.

## Overview

MapAble Core enables:
- **Unified Account System**: Single secure ID across all MapAble services
- **Centralized Billing**: All payments, invoices, and subscriptions in one place
- **Unified Messaging**: Cross-application messaging between users, providers, and administrators
- **Notification System**: Multi-channel notifications (in-app, email, SMS, push)
- **Support Center**: Integrated helpdesk with ticket management

## Architecture

### Database Models

The following Prisma models have been added:

- **ServiceLink**: Tracks which services a user has access to
- **Subscription**: Manages user subscriptions across services (FREE, PREMIUM, ENTERPRISE)
- **Invoice**: Centralized invoice management
- **Message**: Cross-application messaging
- **Notification**: Multi-channel notifications
- **SupportTicket**: Helpdesk ticket management
- **SupportTicketResponse**: Ticket responses and conversations

### Services

All services are located in `lib/services/core/`:

- **BillingService**: Invoice creation, payment recording, billing summaries
- **SubscriptionService**: Subscription management, tier checking, expiration handling
- **MessagingService**: Message creation, threading, read status
- **NotificationService**: Notification delivery, read tracking, bulk notifications
- **SupportService**: Ticket creation, assignment, resolution, statistics
- **ServiceLinkService**: Service linking, access checking, preference management

### API Routes

All API routes are under `/api/core/`:

#### Billing
- `GET /api/core/billing/invoices` - Get user invoices
- `POST /api/core/billing/invoices` - Create invoice
- `GET /api/core/billing/invoices/[id]` - Get invoice by ID
- `POST /api/core/billing/invoices/[id]/pay` - Record payment
- `GET /api/core/billing/summary` - Get billing summary

#### Subscriptions
- `GET /api/core/subscriptions` - Get user subscriptions
- `POST /api/core/subscriptions` - Create subscription
- `GET /api/core/subscriptions/[id]` - Get subscription
- `PATCH /api/core/subscriptions/[id]` - Update subscription
- `DELETE /api/core/subscriptions/[id]` - Cancel subscription

#### Messages
- `GET /api/core/messages` - Get user messages
- `POST /api/core/messages` - Send message
- `GET /api/core/messages/[id]` - Get message
- `POST /api/core/messages/[id]/read` - Mark as read

#### Notifications
- `GET /api/core/notifications` - Get user notifications
- `POST /api/core/notifications/[id]/read` - Mark as read
- `POST /api/core/notifications/read-all` - Mark all as read

#### Support
- `GET /api/core/support/tickets` - Get user tickets
- `POST /api/core/support/tickets` - Create ticket
- `GET /api/core/support/tickets/[id]` - Get ticket
- `POST /api/core/support/tickets/[id]/responses` - Add response

#### Service Links
- `GET /api/core/services` - Get user service links
- `POST /api/core/services` - Link service
- `GET /api/core/services/[serviceType]` - Get service link
- `DELETE /api/core/services/[serviceType]` - Unlink service

## Usage Examples

### Creating a Subscription

```typescript
import { subscriptionService } from "@/lib/services/core";
import { SubscriptionTier, ServiceType } from "@prisma/client";

const subscription = await subscriptionService.createSubscription({
  userId: "user123",
  serviceType: ServiceType.CARE,
  tier: SubscriptionTier.PREMIUM,
});
```

### Creating an Invoice

```typescript
import { billingService } from "@/lib/services/core";

const invoice = await billingService.createInvoice({
  userId: "user123",
  amount: 100.00,
  taxAmount: 10.00,
  dueDate: new Date("2025-02-01"),
  lineItems: [
    {
      description: "Premium Care Subscription",
      quantity: 1,
      unitPrice: 100.00,
      total: 100.00,
    },
  ],
});
```

### Sending a Notification

```typescript
import { notificationService } from "@/lib/services/core";
import { NotificationChannel, NotificationType } from "@prisma/client";

const notification = await notificationService.sendNotification({
  userId: "user123",
  channel: NotificationChannel.IN_APP,
  type: NotificationType.BILLING_UPDATE,
  title: "Invoice Generated",
  content: "Your invoice #INV-12345678 has been generated.",
  actionUrl: "/core/billing/invoices/123",
});
```

### Creating a Support Ticket

```typescript
import { supportService } from "@/lib/services/core";
import { SupportTicketCategory } from "@prisma/client";

const ticket = await supportService.createTicket({
  userId: "user123",
  category: SupportTicketCategory.TECHNICAL,
  subject: "Unable to access Care service",
  description: "I'm having trouble logging into the Care service...",
});
```

## Database Migration

After adding the new models to `prisma/schema.prisma`, run:

```bash
npx prisma migrate dev --name add_mapable_core
```

Or if using pnpm:

```bash
pnpm prisma migrate dev --name add_mapable_core
```

## Integration with Other Services

MapAble Core is designed to be integrated with:
- **MapAble for Care**: Use subscriptions to check premium access
- **MapAble for Transport**: Send notifications for route updates
- **MapAble for Jobs**: Create invoices for premium job matching
- **All Services**: Use unified messaging and support

## Security

All API routes require authentication via NextAuth. Users can only access their own:
- Invoices
- Subscriptions
- Messages
- Notifications
- Support tickets

Staff members with appropriate permissions can access assigned tickets.

## Future Enhancements

- GraphQL API support
- Real-time notifications via WebSocket
- AI-powered chatbot for support
- Automated invoice generation
- Subscription renewal automation
- Multi-currency support
- Payment gateway integrations (Stripe, PayPal, NDIS)
