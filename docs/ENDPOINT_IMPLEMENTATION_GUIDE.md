# Endpoint Implementation Guide

## Quick Start

This guide shows how to implement endpoints following the endpoint strategy.

## Basic Endpoint Pattern

### Using the Endpoint Utilities

```typescript
import { createEndpointHandler, successResponse, errorResponse, parsePagination } from "@/lib/api/endpoint-utils";
import { z } from "zod";
import { UserRole } from "@/lib/security/authorization-utils";

// Define input schema
const createPolicySchema = z.object({
  title: z.string().min(1),
  category: z.enum(["CORE", "CARE", "TRANSPORT"]),
  content: z.record(z.unknown()),
});

// Create GET handler
export const GET = createEndpointHandler(
  async (context, _body) => {
    const { page, limit, skip } = parsePagination(context.request);
    
    // Fetch data
    const policies = await getPolicies({ page, limit, skip });
    const total = await getPolicyCount();

    return successResponse(policies, {
      meta: { page, limit, total },
      requestId: context.requestId,
    });
  },
  {
    rateLimit: "api",
    requireAuth: true,
    cacheControl: "private, max-age=300", // 5 minutes
  }
);

// Create POST handler
export const POST = createEndpointHandler(
  async (context, body) => {
    // body is already validated by the handler
    const policy = await createPolicy({
      ...body,
      createdBy: context.user!.id,
    });

    return successResponse(policy, {
      status: 201,
      requestId: context.requestId,
    });
  },
  {
    rateLimit: "api",
    requireAuth: true,
    requireRoles: [UserRole.NDIA_ADMIN, UserRole.PLAN_MANAGER],
    validateInput: createPolicySchema,
  }
);
```

## Advanced Patterns

### 1. Resource-Specific Authorization

```typescript
export const GET = createEndpointHandler(
  async (context) => {
    const resourceId = context.request.nextUrl.pathname.split("/").pop();
    
    // Check resource access
    const hasAccess = await hasResourceAccess(
      context.user!.id,
      resourceId!,
      "policy"
    );

    if (!hasAccess) {
      return errorResponse("FORBIDDEN", "No access to this resource", {
        status: 403,
        requestId: context.requestId,
      });
    }

    const resource = await getResource(resourceId!);
    return successResponse(resource, { requestId: context.requestId });
  },
  {
    requireAuth: true,
  }
);
```

### 2. Batch Operations

```typescript
const batchSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    action: z.enum(["update", "delete"]),
    data: z.record(z.unknown()).optional(),
  })),
});

export const POST = createEndpointHandler(
  async (context, body) => {
    const results = await Promise.all(
      body.items.map(async (item) => {
        try {
          if (item.action === "update") {
            return await updateItem(item.id, item.data);
          } else {
            return await deleteItem(item.id);
          }
        } catch (error) {
          return { id: item.id, error: error.message };
        }
      })
    );

    return successResponse({ results }, { requestId: context.requestId });
  },
  {
    requireAuth: true,
    validateInput: batchSchema,
    rateLimit: "strict", // Stricter limits for batch operations
  }
);
```

### 3. File Upload/Export

```typescript
export const GET = createEndpointHandler(
  async (context) => {
    const data = await getExportData(context.user!.id);
    const csv = convertToCSV(data);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="export-${Date.now()}.csv"`,
      },
    });
  },
  {
    requireAuth: true,
    rateLimit: "api",
  }
);
```

### 4. Webhook Endpoints

```typescript
export const POST = createEndpointHandler(
  async (context, body) => {
    // Verify webhook signature
    const signature = context.request.headers.get("x-signature");
    if (!verifySignature(body, signature)) {
      return errorResponse("UNAUTHORIZED", "Invalid signature", {
        status: 401,
        requestId: context.requestId,
      });
    }

    // Process webhook
    await processWebhook(body);

    return successResponse({ received: true }, { requestId: context.requestId });
  },
  {
    rateLimit: "none", // Webhooks may have different rate limits
    requireAuth: false, // Webhooks use signature auth instead
  }
);
```

## Migration Checklist

When updating existing endpoints:

- [ ] Add request ID tracking
- [ ] Standardize error responses
- [ ] Add rate limiting
- [ ] Implement pagination (for list endpoints)
- [ ] Add input validation with Zod
- [ ] Add proper authorization checks
- [ ] Add caching headers where appropriate
- [ ] Update documentation
- [ ] Add error logging

## Example: Migrated Endpoint

### Before
```typescript
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policies = await service.getPolicies();
    return NextResponse.json({ policies });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### After
```typescript
export const GET = createEndpointHandler(
  async (context) => {
    const { page, limit, skip } = parsePagination(context.request);
    const filters = parseFilters(context.request);
    const sort = parseSort(context.request);

    const { policies, total } = await service.getPolicies({
      page,
      limit,
      skip,
      filters,
      sort,
    });

    return paginatedResponse(policies, {
      page,
      limit,
      total,
      requestId: context.requestId,
    });
  },
  {
    requireAuth: true,
    rateLimit: "api",
    cacheControl: "private, max-age=300",
  }
);
```

## Performance Tips

1. **Use pagination** for all list endpoints
2. **Cache responses** for read-heavy endpoints
3. **Batch database queries** when possible
4. **Use field selection** to reduce payload size
5. **Implement parallel operations** for independent data fetching

## Security Tips

1. **Always validate input** with Zod schemas
2. **Check authentication** before authorization
3. **Verify resource ownership** for resource-specific endpoints
4. **Use appropriate rate limits** based on endpoint sensitivity
5. **Log security events** (failed auth, rate limit hits, etc.)
