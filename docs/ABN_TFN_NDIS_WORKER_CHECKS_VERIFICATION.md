# ABN/TFN/NDIS Worker Checks Verification

## Overview

Comprehensive verification system for Australian Business Numbers (ABN), Tax File Numbers (TFN), and NDIS Worker Screening Checks. This system integrates with the Unified Payment Architecture and provides secure, compliant verification services for workers and providers.

## Features

### 1. ABN Verification
- Format validation (11 digits with checksum)
- Australian Business Register (ABR) API integration (placeholder for production)
- Provider registration integration
- Automatic formatting and cleaning

### 2. TFN Verification
- Format validation (8-9 digits with checksum)
- Secure storage (hashed, never stores full TFN)
- Duplicate detection
- Last 4 digits only for display

### 3. NDIS Worker Check
- NDIS Worker Screening Check verification
- Integration with WWCC and National Police Check
- Worker eligibility verification
- Screening status tracking

## Database Schema Changes

### Updated `VerificationType` Enum
Added new verification types:
- `ABN` - Australian Business Number verification
- `TFN` - Tax File Number verification
- `NDIS_WORKER_CHECK` - NDIS Worker Screening Check

### Updated `ProviderRegistration` Model
Added fields for ABN verification:
- `abn` - Australian Business Number (string, optional)
- `abnVerified` - Boolean flag for verification status
- `abnVerifiedAt` - Timestamp of verification

## Services

### ABN Verification Service
**File**: `lib/services/verification/abn-verification-service.ts`

**Key Methods**:
- `validateABNFormat(abn: string)` - Validate ABN format and checksum
- `verifyABN(request: ABNVerificationRequest)` - Verify ABN (format validation + ABR API integration placeholder)
- `verifyProviderABN(userId: string, abn: string)` - Verify ABN for provider registration
- `createABNVerificationRecord(...)` - Create/update verification record

**ABN Format**:
- 11 digits
- Optional spaces/hyphens (automatically cleaned)
- Validates checksum using weighted sum algorithm

### TFN Verification Service
**File**: `lib/services/verification/tfn-verification-service.ts`

**Key Methods**:
- `validateTFNFormat(tfn: string)` - Validate TFN format and checksum
- `verifyTFN(request: TFNVerificationRequest)` - Verify TFN format (NOT actual TFN validation - requires ATO access)
- `createTFNVerificationRecord(...)` - Create/update verification record (stores hash, not full TFN)
- `checkTFNDuplicate(...)` - Check if TFN already registered

**TFN Security**:
- Never stores full TFN in plain text
- Stores SHA-256 hash for duplicate detection
- Stores only last 4 digits for display
- Masks TFN for display: `XXX XXX XXXX`

**TFN Format**:
- 8-9 digits
- Validates checksum using weighted sum algorithm

### NDIS Worker Check Service
**File**: `lib/services/verification/ndis-worker-check-service.ts`

**Key Methods**:
- `verifyNDISWorkerCheck(request: NDISWorkerCheckRequest)` - Verify NDIS Worker Check status
- `isWorkerEligible(workerId: string)` - Check if worker is eligible to work with NDIS participants
- `getWorkerScreeningSummary(workerId: string)` - Get comprehensive screening status

**NDIS Worker Check Requirements**:
- Working with Children Check (WWCC) must be verified
- National Police Check (IDENTITY verification) must be verified
- NDIS Worker Screening Database check (placeholder for production API)

### Unified Verification Service
**File**: `lib/services/verification/unified-verification-service.ts`

**Key Methods**:
- `verify(request: UnifiedVerificationRequest)` - Verify single verification type
- `batchVerifyWorker(...)` - Batch verify multiple types for a worker
- `getWorkerVerificationStatus(workerId: string)` - Get all verification statuses

## API Routes

### 1. Verify Single Verification Type
**POST** `/api/verification/verify`

**Request Body**:
```json
{
  "type": "ABN" | "TFN" | "NDIS_WORKER_CHECK",
  "workerId": "string (optional)",
  "userId": "string (optional)",
  // ABN-specific
  "abn": "string (required if type is ABN)",
  // TFN-specific
  "tfn": "string (required if type is TFN)",
  "dateOfBirth": "string (optional)",
  "fullName": "string (optional)",
  // NDIS Worker Check specific
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "type": "ABN" | "TFN" | "NDIS_WORKER_CHECK",
  "result": {
    // Verification result specific to type
  }
}
```

### 2. Get Verification Status
**GET** `/api/verification/status/[workerId]`

**Response**:
```json
{
  "success": true,
  "workerId": "string",
  "verifications": {
    "abn": { "status": "...", "verifiedAt": "...", "expiresAt": "...", "metadata": {...} },
    "tfn": { "status": "...", "verifiedAt": "...", "tfnLast4": "XXXX" },
    "ndisWorkerCheck": {
      "ndisWorkerCheck": {...},
      "wwcc": {...},
      "policeCheck": {...},
      "isEligible": true
    }
  }
}
```

### 3. Batch Verification
**POST** `/api/verification/batch`

**Request Body**:
```json
{
  "workerId": "string (required)",
  "abn": "string (optional)",
  "tfn": "string (optional)",
  "dateOfBirth": "string (optional)",
  "fullName": "string (optional)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "email": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "workerId": "string",
  "results": {
    "abn": {...},
    "tfn": {...},
    "ndisWorkerCheck": {...}
  }
}
```

### 4. Verify Provider ABN
**POST** `/api/verification/provider/abn`

**Request Body**:
```json
{
  "abn": "string (required)"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "valid": true,
    "abn": "12345678901",
    "entityName": "...",
    "entityType": "...",
    ...
  }
}
```

## Security & Privacy

### ABN
- Format validation only (production requires ABR API integration)
- Stored in ProviderRegistration for providers
- Displayed in formatted form (with spaces)

### TFN
- **CRITICAL**: Never stores full TFN in plain text
- Stores SHA-256 hash for duplicate detection
- Stores only last 4 digits for display
- Masks for display: `XXX XXX XXXX`
- Actual TFN verification requires ATO integration (restricted access)

### NDIS Worker Check
- Integrates with existing WWCC and Police Check verifications
- Tracks expiration dates
- Validates eligibility before allowing worker access

## Integration Points

### With Worker Onboarding
- ABN/TFN verification integrated into worker onboarding flow
- NDIS Worker Check required before worker can access participant services

### With Provider Registration
- ABN verification integrated into provider registration
- Automatically updates ProviderRegistration with verified ABN

### With Payment Architecture
- Verifications linked to billing and payment processing
- Worker eligibility checks before payment processing

## Production Implementation Notes

### ABN Verification
**TODO**: Integrate with Australian Business Register (ABR) API
- API Endpoint: `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx`
- Requires API key registration
- Returns entity details, status, GST registration, etc.

### TFN Verification
**SECURITY WARNING**: Actual TFN verification requires ATO integration
- Format validation only implemented
- Actual verification requires special ATO registration
- Never store or transmit full TFN except to ATO systems
- Consider using ATO's TFN declaration form instead of verification

### NDIS Worker Check
**TODO**: Integrate with NDIS Worker Screening Database API
- Check with NDIS for API availability
- State-based Worker Screening Unit APIs may be required
- Verify worker exclusion status before allowing access

## Environment Variables

No new environment variables required. Integration with external APIs will require:

```
# ABN Verification (ABR API)
ABR_API_KEY=...
ABR_API_URL=https://abr.business.gov.au/abrxmlsearch/

# NDIS Worker Screening (if API available)
NDIS_SCREENING_API_KEY=...
NDIS_SCREENING_API_URL=...

# ATO TFN Verification (if ATO access granted - NOT RECOMMENDED)
ATO_API_KEY=...
ATO_API_URL=...
```

## Files Created

### Services
- `lib/services/verification/abn-verification-service.ts`
- `lib/services/verification/tfn-verification-service.ts`
- `lib/services/verification/ndis-worker-check-service.ts`
- `lib/services/verification/unified-verification-service.ts`

### API Routes
- `app/api/verification/verify/route.ts`
- `app/api/verification/status/[workerId]/route.ts`
- `app/api/verification/batch/route.ts`
- `app/api/verification/provider/abn/route.ts`

### Database
- `prisma/schema.prisma` (updated with new VerificationType enum values and ProviderRegistration fields)

## Testing

### ABN Format Validation
```typescript
// Valid ABN: 51 824 753 556
ABNVerificationService.validateABNFormat("51 824 753 556"); // true

// Invalid ABN (checksum fails)
ABNVerificationService.validateABNFormat("12345678901"); // false
```

### TFN Format Validation
```typescript
// Valid 9-digit TFN
TFNVerificationService.validateTFNFormat("123456789"); // true

// Masked display
TFNVerificationService.maskTFN("123456789"); // "XXX XXX 6789"
```

### NDIS Worker Check
```typescript
// Check worker eligibility
const isEligible = await NDISWorkerCheckService.isWorkerEligible(workerId);

// Get screening summary
const summary = await NDISWorkerCheckService.getWorkerScreeningSummary(workerId);
```

## Next Steps

1. **ABR API Integration**: Register for ABR API access and integrate real-time ABN verification
2. **NDIS Screening API**: Check with NDIS for Worker Screening Database API availability
3. **Worker Onboarding UI**: Integrate verification forms into worker onboarding flow
4. **Provider Registration UI**: Add ABN verification to provider registration form
5. **Verification Dashboard**: Create admin dashboard for managing worker verifications
6. **Expiration Alerts**: Implement automated alerts for expiring verifications

## Compliance Notes

- **ABN**: Publicly available information, safe to store and verify
- **TFN**: Highly sensitive information, must be protected per Privacy Act 1988 (Cth)
- **NDIS Worker Check**: Mandatory for workers providing NDIS services
- All verifications must comply with Australian Privacy Principles (APPs)
