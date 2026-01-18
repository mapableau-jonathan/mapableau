# Endpoint Strategy - Quick Reference

## Core Principles

1. **Consistency**: All endpoints follow the same patterns
2. **Security**: Authentication → Authorization → Validation → Processing
3. **Performance**: Cache, paginate, batch, optimize queries
4. **Reliability**: Proper error handling, logging, request tracking

## Standard Endpoint Structure

```typescript
import { createEndpointHandler, successResponse, parsePagination } from "@/lib/api/endpoint-utils";
import { z } from "zod";

const schema = z.object({ /* ... */ });

export const GET = createEndpointHandler(
  async (context) => {
    // 1. Parse query parameters
    const { page, limit } = parsePagination(context.request);
    
    // 2. Fetch data
    const data = await fetchData({ page, limit });
    
    // 3. Return response
    return successResponse(data, { requestId: context.requestId });
  },
  {
    requireAuth: true,
    rateLimit: "api",
    cacheControl: "private, max-age=300",
  }
);
```

## Rate Limiting Tiers

| Tier | Limit | Use Case |
|------|-------|----------|
| `none` | No limit | Internal/system endpoints |
| `api` | 100/15min | General API endpoints |
| `strict` | 10/min | Sensitive operations |
| `auth` | 5/15min | Authentication endpoints |
| `payment` | 5/min | Payment operations |

## Response Formats

### Success
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-18T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [ ... ],
    "requestId": "req_abc123"
  }
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Rate Limited
- `500` - Internal Error

## Common Patterns

### List Endpoint
```typescript
export const GET = createEndpointHandler(
  async (context) => {
    const { page, limit, skip } = parsePagination(context.request);
    const sort = parseSort(context.request);
    const filters = parseFilters(context.request);
    
    const { items, total } = await getItems({ page, limit, skip, sort, filters });
    
    return paginatedResponse(items, { page, limit, total, requestId: context.requestId });
  },
  { requireAuth: true, rateLimit: "api" }
);
```

### Create Endpoint
```typescript
export const POST = createEndpointHandler(
  async (context, body) => {
    const item = await createItem({ ...body, createdBy: context.user!.id });
    return successResponse(item, { status: 201, requestId: context.requestId });
  },
  {
    requireAuth: true,
    requireRoles: [UserRole.ADMIN],
    validateInput: createSchema,
    rateLimit: "api",
  }
);
```

### Update Endpoint
```typescript
export const PATCH = createEndpointHandler(
  async (context, body) => {
    const id = context.request.nextUrl.pathname.split("/").pop();
    const item = await updateItem(id!, body);
    return successResponse(item, { requestId: context.requestId });
  },
  {
    requireAuth: true,
    validateInput: updateSchema,
    rateLimit: "api",
  }
);
```

### Delete Endpoint
```typescript
export const DELETE = createEndpointHandler(
  async (context) => {
    const id = context.request.nextUrl.pathname.split("/").pop();
    await deleteItem(id!);
    return successResponse(null, { status: 204, requestId: context.requestId });
  },
  {
    requireAuth: true,
    requireRoles: [UserRole.ADMIN],
    rateLimit: "strict",
  }
);
```

## Implementation Priority

### Phase 1: Critical Endpoints (Week 1)
- Authentication endpoints
- Payment endpoints
- Admin endpoints

### Phase 2: High-Traffic Endpoints (Week 2-3)
- List endpoints (add pagination)
- Read endpoints (add caching)
- Search endpoints

### Phase 3: Remaining Endpoints (Week 4+)
- Update endpoints
- Delete endpoints
- Batch operations

## Quick Checklist

For each new/updated endpoint:
- [ ] Uses `createEndpointHandler`
- [ ] Has input validation (Zod schema)
- [ ] Has proper authentication
- [ ] Has proper authorization
- [ ] Has rate limiting
- [ ] Has error handling
- [ ] Returns standardized response
- [ ] Includes request ID
- [ ] Has appropriate cache headers
- [ ] Is documented
