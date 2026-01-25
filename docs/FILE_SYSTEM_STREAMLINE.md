# File System Streamline Plan

## Current Issues

1. **Root Directory Clutter**: Many markdown files in root (AUTHENTICATION_SYSTEM_SUMMARY.md, CODE_IMPROVEMENTS_SUMMARY.md, etc.)
2. **Scattered Documentation**: Docs split between root and `docs/` directory
3. **Deep API Nesting**: Very deep API route nesting making navigation difficult
4. **Service Organization**: Services could be better organized with clearer boundaries

## Streamlining Actions

### 1. Consolidate Documentation
- Move all root-level `.md` files to `docs/archive/` or `docs/`
- Keep only essential files in root (README.md, package.json, etc.)

### 2. Simplify API Structure
- Group related endpoints more logically
- Reduce nesting depth where possible
- Use query parameters instead of deep paths where appropriate

### 3. Service Organization
- Ensure all services have proper index.ts barrel exports
- Group related services together
- Remove duplicate exports

### 4. Payment Node Network - Simplified Approach
Instead of full PBFT implementation, start with:
- Basic network types and structures
- Simple RPC server (HTTP only, no WebSocket initially)
- Basic block/transaction storage
- Ethereum-compatible RPC methods
- Custom AbilityPay RPC methods
- Skip complex consensus initially (use simple leader-based approach)
