# API Endpoint Strategy

## Overview
This document outlines the comprehensive strategy for API endpoint design, optimization, and management in the MapableAU platform.

## Table of Contents
1. [Endpoint Organization](#endpoint-organization)
2. [Performance Strategy](#performance-strategy)
3. [Security Strategy](#security-strategy)
4. [Caching Strategy](#caching-strategy)
5. [Rate Limiting Strategy](#rate-limiting-strategy)
6. [Error Handling Strategy](#error-handling-strategy)
7. [Response Format Strategy](#response-format-strategy)
8. [Versioning Strategy](#versioning-strategy)
9. [Documentation Strategy](#documentation-strategy)
10. [Testing Strategy](#testing-strategy)

## Endpoint Organization

### Current Structure
```
/api/
├── auth/              # Authentication & authorization
├── abilitypay/         # Payment processing
├── compliance/        # Compliance & reporting
├── care/              # Care management
├── ndia/              # NDIA integration
├── jobs/              # Job management
├── transport/         # Transport services
├── quality/           # Quality metrics
└── core/              # Core services
```

### Organization Principles

#### 1. Domain-Driven Design
- Group endpoints by business domain
- Keep related functionality together
- Minimize cross-domain dependencies

#### 2. RESTful Conventions
```
GET    /api/resource           # List resources
GET    /api/resource/:id       # Get single resource
POST   /api/resource           # Create resource
PUT    /api/resource/:id       # Update resource (full)
PATCH  /api/resource/:id       # Update resource (partial)
DELETE /api/resource/:id       # Delete resource
```

#### 3. Action-Based Endpoints
For complex operations that don't fit REST:
```
POST /api/resource/:id/action  # e.g., /api/incidents/:id/ndis-report
POST /api/resource/:id/action/:subaction  # e.g., /api/policies/:id/acknowledge
```

### Recommended Structure Improvements

#### 1. Versioning
```
/api/v1/auth/
/api/v2/auth/  # Future breaking changes
```

#### 2. Service-Specific Routes
```
/api/auth/service/:serviceId/...  # Service-specific auth
/api/abilitypay/service/:serviceId/...  # Service-specific payments
```

#### 3. Batch Operations
```
POST /api/resource/batch  # Batch create/update
GET  /api/resource/batch  # Batch retrieve
```

## Performance Strategy

### 1. Database Query Optimization

#### Principles
- **Batch queries** when possible
- **Use select** to limit fields
- **Implement pagination** for list endpoints
- **Cache frequently accessed data**

#### Implementation Pattern
```typescript
// ❌ Bad: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
}

// ✅ Good: Batch query
const users = await prisma.user.findMany({
  include: { profile: true },
  take: 20, // Pagination
  skip: (page - 1) * 20,
});
```

### 2. Response Optimization

#### Compression
- Enable gzip/brotli compression
- Compress JSON responses > 1KB
- Use streaming for large responses

#### Pagination
```typescript
// Standard pagination
GET /api/resource?page=1&limit=20&sort=createdAt:desc

// Cursor-based pagination (for large datasets)
GET /api/resource?cursor=abc123&limit=20
```

#### Field Selection
```typescript
// Allow clients to request specific fields
GET /api/resource?fields=id,name,email
```

### 3. Parallel Operations
```typescript
// ✅ Run independent operations in parallel
const [user, permissions, preferences] = await Promise.all([
  getUser(userId),
  getPermissions(userId),
  getPreferences(userId),
]);
```

### 4. Lazy Loading
- Load related data only when requested
- Use `include` parameter for optional relations
- Defer expensive computations

## Security Strategy

### 1. Authentication & Authorization

#### Pattern
```typescript
export async function GET(req: Request) {
  // 1. Authenticate
  const user = await requireAuth(req);
  
  // 2. Authorize (role-based)
  await requireRole([UserRole.ADMIN], req);
  
  // 3. Resource-level authorization
  await requireResourceAccess(user.id, resourceId, "resource");
  
  // 4. Process request
  // ...
}
```

#### Authorization Levels
1. **Public**: No authentication required
2. **Authenticated**: Any logged-in user
3. **Role-based**: Specific roles (admin, plan manager, etc.)
4. **Resource-based**: User owns/accesses the resource
5. **Service-based**: Service has permission

### 2. Input Validation

#### Pattern
```typescript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
});

export async function POST(req: Request) {
  const body = await req.json();
  const data = schema.parse(body); // Throws on invalid
  // ...
}
```

### 3. Rate Limiting

#### Tiers
- **Public endpoints**: 100 req/min
- **Authenticated endpoints**: 1000 req/min
- **Payment endpoints**: 10 req/min
- **Admin endpoints**: 5000 req/min

#### Implementation
```typescript
import { apiRateLimit, paymentRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  // Apply rate limiting
  const rateLimitResponse = await paymentRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Process request
  // ...
}
```

### 4. Security Headers
- Already implemented in `middleware.ts`
- CSP, HSTS, X-Frame-Options, etc.

## Caching Strategy

### 1. Response Caching

#### Cache-Control Headers
```typescript
// Static data (1 hour)
response.headers.set("Cache-Control", "public, max-age=3600");

// User-specific (5 minutes)
response.headers.set("Cache-Control", "private, max-age=300");

// No cache
response.headers.set("Cache-Control", "no-store, no-cache");
```

#### Cache Levels
1. **Browser Cache**: Static resources, public data
2. **CDN Cache**: Public API responses
3. **Application Cache**: Redis/Memory for frequently accessed data
4. **Database Query Cache**: Prisma query results

### 2. Cache Invalidation
- **Time-based**: TTL expiration
- **Event-based**: Invalidate on updates
- **Tag-based**: Invalidate by resource type

### 3. Cache Keys
```typescript
// Pattern: resource:type:id:version
const cacheKey = `user:${userId}:v1`;
const cacheKey = `policy:${policyId}:${updatedAt}`;
```

## Rate Limiting Strategy

### Current Implementation
- Basic rate limiting in middleware
- Payment-specific rate limiting

### Recommended Enhancements

#### 1. Tiered Rate Limits
```typescript
const rateLimitTiers = {
  free: { requests: 100, window: 60000 },      // 100/min
  basic: { requests: 1000, window: 60000 },    // 1000/min
  premium: { requests: 10000, window: 60000 }, // 10000/min
};
```

#### 2. Endpoint-Specific Limits
```typescript
const endpointLimits = {
  "/api/auth/login": { requests: 5, window: 60000 },      // 5/min
  "/api/payments": { requests: 10, window: 60000 },       // 10/min
  "/api/admin/*": { requests: 1000, window: 60000 },     // 1000/min
};
```

#### 3. Sliding Window Algorithm
- More accurate than fixed window
- Prevents burst attacks
- Better user experience

## Error Handling Strategy

### 1. Standardized Error Responses

#### Format
```typescript
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input data",
    details: [
      { field: "email", message: "Invalid email format" }
    ],
    timestamp: "2024-01-18T12:00:00Z",
    requestId: "req_abc123"
  }
}
```

#### HTTP Status Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (authorization failed)
- `404`: Not Found
- `409`: Conflict (resource already exists)
- `422`: Unprocessable Entity (business logic error)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
- `503`: Service Unavailable

### 2. Error Handling Pattern
```typescript
export async function POST(req: Request) {
  try {
    // Validate input
    const data = schema.parse(await req.json());
    
    // Process request
    const result = await processRequest(data);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", details: error.errors } },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: error.message } },
        { status: 401 }
      );
    }
    
    // Log unexpected errors
    logger.error("Unexpected error", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
```

## Response Format Strategy

### 1. Standard Response Structure

#### Success Response
```typescript
{
  data: { ... },           // Response data
  meta: {                 // Metadata (optional)
    page: 1,
    limit: 20,
    total: 100,
    timestamp: "2024-01-18T12:00:00Z"
  }
}
```

#### List Response
```typescript
{
  data: [ ... ],           // Array of items
  meta: {
    pagination: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5
    }
  }
}
```

#### Error Response
```typescript
{
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details: { ... },      // Optional details
    requestId: "req_abc123"
  }
}
```

### 2. Content Negotiation
- Support `Accept` header for different formats
- Default: `application/json`
- Optional: `application/xml`, `text/csv` (for exports)

## Versioning Strategy

### 1. URL Versioning (Recommended)
```
/api/v1/auth/login
/api/v2/auth/login  # Breaking changes
```

### 2. Header Versioning (Alternative)
```
Accept: application/vnd.mapableau.v1+json
```

### 3. Version Lifecycle
- **v1**: Current stable version
- **v2**: New version (maintain v1 for 6 months)
- **Deprecated**: Mark as deprecated, remove after 12 months

## Documentation Strategy

### 1. OpenAPI/Swagger
- Generate from code annotations
- Interactive API explorer
- Request/response examples

### 2. Code Documentation
```typescript
/**
 * Create a new policy
 * 
 * @route POST /api/compliance/policies
 * @access Admin, Plan Manager
 * @rateLimit 100 req/min
 * 
 * @param {string} title - Policy title
 * @param {PolicyCategory} category - Policy category
 * @param {object} content - Policy content
 * 
 * @returns {Policy} Created policy
 * @throws {401} Unauthorized
 * @throws {403} Forbidden
 * @throws {400} Validation error
 */
export async function POST(req: Request) {
  // ...
}
```

### 3. Endpoint Documentation
- Purpose and use cases
- Authentication requirements
- Request/response examples
- Error scenarios
- Rate limits

## Testing Strategy

### 1. Unit Tests
- Test individual endpoint handlers
- Mock external dependencies
- Test error cases

### 2. Integration Tests
- Test full request/response cycle
- Test database interactions
- Test authentication/authorization

### 3. Performance Tests
- Load testing for critical endpoints
- Measure response times
- Identify bottlenecks

### 4. Security Tests
- Test authentication bypass attempts
- Test authorization boundaries
- Test input validation
- Test rate limiting

## Implementation Priorities

### Phase 1: Foundation (Immediate)
1. ✅ Standardize error handling
2. ✅ Implement consistent response format
3. ✅ Add request ID tracking
4. ✅ Enhance rate limiting

### Phase 2: Performance (Short-term)
1. Add response caching
2. Implement pagination for all list endpoints
3. Optimize database queries
4. Add field selection

### Phase 3: Advanced (Medium-term)
1. Implement API versioning
2. Add OpenAPI documentation
3. Implement batch operations
4. Add webhook support

### Phase 4: Optimization (Long-term)
1. Implement GraphQL layer (optional)
2. Add real-time subscriptions
3. Implement advanced caching strategies
4. Add analytics and monitoring

## Monitoring & Analytics

### 1. Metrics to Track
- Request rate per endpoint
- Response times (p50, p95, p99)
- Error rates
- Cache hit rates
- Rate limit hits

### 2. Alerts
- High error rates (>5%)
- Slow responses (>1s)
- Rate limit violations
- Unusual traffic patterns

## Best Practices Checklist

### For Each Endpoint
- [ ] Input validation with Zod
- [ ] Authentication check
- [ ] Authorization check
- [ ] Rate limiting
- [ ] Error handling
- [ ] Logging
- [ ] Response format consistency
- [ ] Request ID tracking
- [ ] Documentation

### Performance
- [ ] Database queries optimized
- [ ] Pagination implemented
- [ ] Caching where appropriate
- [ ] Parallel operations used
- [ ] Response compression enabled

### Security
- [ ] Input sanitization
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Security headers set

## Migration Path

### Existing Endpoints
1. Audit all endpoints
2. Identify optimization opportunities
3. Prioritize by usage/importance
4. Implement improvements incrementally

### New Endpoints
- Follow strategy from day one
- Use shared utilities
- Consistent patterns
- Full documentation
