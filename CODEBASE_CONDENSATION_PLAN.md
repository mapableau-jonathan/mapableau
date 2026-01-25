# Codebase & Database Condensation Plan

## Overview
This document outlines the condensation strategy to reduce codebase size and database complexity while maintaining functionality.

## Analysis Summary

### Current State
- **91 service classes** across the codebase
- **1,561 lines** in Prisma schema
- Multiple overlapping services with similar functionality
- Some intentional wrapper patterns (verification services)

### Condensation Opportunities

## 1. Service Consolidation

### ✅ Keep (Different Purposes)
- `core/subscription-service.ts` - MapAble Core subscriptions (ServiceType-based)
- `payments/subscription-service.ts` - Payment provider subscriptions (Stripe/PayPal)
- `abn-service.ts` + `abn-verification-service.ts` - Wrapper pattern for orchestrator
- `tfn-service.ts` + `tfn-verification-service.ts` - Wrapper pattern for orchestrator

### 🔄 Consolidate (Similar Functionality)

#### Analytics Services
- `analytics/billing-analytics-service.ts`
- `analytics/payment-analytics-service.ts`
- `analytics/usage-analytics-service.ts`
- `quality/analytics-service.ts`
- `jobs/analytics-service.ts`
- `advertising/analytics-service.ts`

**Action:** Create unified `AnalyticsService` with domain-specific methods

#### Payment Services
- `payments/unified-payment-service.ts` - General payment processing
- `abilitypay/payment-service.ts` - NDIS-specific payments
- `billing/invoice-payment-service.ts` - Invoice payments
- `advertising/payment-service.ts` - Advertising payments

**Action:** Keep separate but document clear boundaries

#### Transport Services
- `transport/route-optimizer.ts`
- `transport/route-service.ts`
- `transport/booking-service.ts`
- `transport/delivery-tracking-service.ts`
- `transport/sms-notification-service.ts`
- `transport/calendar-integration-service.ts`
- `transport/transport-billing-service.ts`
- `transport/compliance-service.ts`

**Action:** Group into `transport/` namespace, keep separate files for clarity

## 2. Database Schema Condensation

### Models to Review

#### Payment Network Models (Keep - Used)
- `PaymentNode` - Used in blockchain infrastructure
- `Block` - Used in blockchain infrastructure  
- `NetworkTransaction` - Used in blockchain infrastructure

**Status:** ✅ Keep - These are actively used in AbilityPay blockchain features

#### Potential Consolidations

1. **Notification/Messaging Models**
   - `Message` + `Notification` - Could potentially be unified
   - **Decision:** Keep separate - different use cases (messages are bidirectional, notifications are one-way)

2. **Support Models**
   - `SupportTicket` + `SupportTicketResponse` - Already well-structured
   - **Decision:** Keep as-is

3. **Compliance Models**
   - Multiple compliance models (Incident, Complaint, Risk, Policy)
   - **Decision:** Keep separate - different domains and audit requirements

## 3. Code Reduction Strategies

### Remove Unused Code
1. Search for unused imports
2. Remove commented-out code blocks
3. Remove deprecated functions
4. Consolidate duplicate utility functions

### Simplify Patterns
1. Use service factory pattern more consistently
2. Reduce boilerplate with route handlers
3. Consolidate error handling

## 4. Implementation Priority

### High Priority (Immediate Impact)
1. ✅ Document service boundaries clearly
2. ✅ Remove unused utility functions
3. ✅ Consolidate duplicate analytics logic

### Medium Priority (Code Quality)
1. Standardize service patterns
2. Reduce route handler boilerplate
3. Consolidate error handling

### Low Priority (Future)
1. Consider merging similar services if patterns emerge
2. Database schema optimization (if performance issues)

## 5. Metrics

### Before Condensation
- Service files: 91
- Schema lines: 1,561
- Estimated LOC: ~50,000+

### Target After Condensation
- Service files: ~75-80 (remove truly unused, consolidate analytics)
- Schema lines: ~1,500 (minimal reduction - models are needed)
- Estimated LOC reduction: ~5-10%

## Notes

- **Do NOT remove:** Blockchain models (PaymentNode, Block, NetworkTransaction) - actively used
- **Do NOT merge:** Subscription services - serve different purposes
- **Do NOT remove:** Verification wrappers - intentional pattern for orchestrator
- **Focus on:** Analytics consolidation, unused code removal, documentation
