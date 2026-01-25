# Payment Node Network - Simplified Implementation

## Overview

A simplified Payment Node Network with RPC MainNet interface supporting both Ethereum-compatible and custom AbilityPay methods. This implementation focuses on the core RPC functionality without the complex PBFT consensus initially.

## Architecture

### Core Components

1. **RPC Server**: HTTP JSON-RPC 2.0 server
2. **Ethereum Methods**: Standard Ethereum JSON-RPC methods
3. **AbilityPay Methods**: Custom NDIS and AbilityPay-specific methods
4. **Network Adapter**: Integrates with existing blockchain interface
5. **Database Models**: PaymentNode, Block, NetworkTransaction

## RPC Endpoint

### Base URL
```
POST /api/abilitypay/rpc
GET /api/abilitypay/rpc (list methods)
```

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_blockNumber",
  "params": []
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x1234"
}
```

## Available Methods

### Ethereum-Compatible Methods

- `eth_blockNumber` - Latest block number
- `eth_getBalance(address, block?)` - Account balance
- `eth_sendTransaction(transaction)` - Submit transaction
- `eth_getTransactionReceipt(txHash)` - Transaction status
- `eth_getBlockByNumber(blockNumber, fullTransactions?)` - Block details
- `eth_call(call, block?)` - Contract call (read-only)
- `eth_estimateGas(transaction)` - Gas estimation
- `net_version()` - Network ID
- `net_peerCount()` - Connected peers

### AbilityPay Custom Methods

- `abilitypay_getNDISPlan(planId)` - Get NDIS plan details
- `abilitypay_getTokenVouchers(participantId)` - Get token vouchers
- `abilitypay_getPaymentHistory(participantId, limit?)` - Payment history
- `abilitypay_validatePayment(paymentData)` - Validate payment
- `abilitypay_getProviderStatus(providerId)` - Provider status
- `abilitypay_getNetworkStatus()` - Network statistics

#### Quality & Safeguarding Methods

- `abilitypay_getQualityRating(providerId, participantId?)` - Get quality rating
- `abilitypay_getSafeguardingBenchmark(providerId, participantId?)` - Get safeguarding score
- `abilitypay_submitQualityRating(ratingData)` - Submit quality rating
- `abilitypay_submitSafeguardingUpdate(benchmarkData)` - Submit safeguarding update
- `abilitypay_getQualityHistory(providerId, limit?)` - Quality rating history
- `abilitypay_getSafeguardingHistory(providerId, limit?)` - Safeguarding history

## Usage Examples

### Get Latest Block Number
```bash
curl -X POST http://localhost:3000/api/abilitypay/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_blockNumber",
    "params": []
  }'
```

### Get NDIS Plan
```bash
curl -X POST http://localhost:3000/api/abilitypay/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "abilitypay_getNDISPlan",
    "params": ["plan-id-here"]
  }'
```

### Submit Quality Rating
```bash
curl -X POST http://localhost:3000/api/abilitypay/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "abilitypay_submitQualityRating",
    "params": [{
      "providerId": "provider-id",
      "rating": 5,
      "category": "service_quality",
      "comment": "Excellent service",
      "reviewerId": "user-id"
    }]
  }'
```

## Database Schema

### PaymentNode
- Node identity and registration
- Status tracking (PENDING, ACTIVE, SUSPENDED, OFFLINE)
- Role (VALIDATOR, OBSERVER, ARCHIVE)

### Block
- Block number, hash, previous hash
- Validator reference
- Merkle root
- Transaction count

### NetworkTransaction
- Transaction hash, type, from, to
- Amount, nonce, signature
- Status (PENDING, INCLUDED, CONFIRMED, FAILED)
- JSON data field for AbilityPay-specific data

### Transaction Types
- `PAYMENT` - Payment transactions
- `TOKEN_MINT` - Token minting
- `TOKEN_TRANSFER` - Token transfers
- `PLAN_UPDATE` - NDIS plan updates
- `NODE_REGISTRATION` - Node registration
- `QUALITY_RATING` - Quality ratings
- `SAFEGUARDING_UPDATE` - Safeguarding benchmarks

## Integration

### Using Payment Network Adapter

```typescript
import { createBlockchainAdapter } from "@/lib/services/abilitypay/blockchain";

const adapter = createBlockchainAdapter({
  provider: "payment-network",
  networkUrl: "http://localhost:3000/api/abilitypay/rpc",
});

// Use adapter like any other blockchain adapter
const txHash = await adapter.mintToken(
  contractAddress,
  recipient,
  amount,
  rules
);
```

## Quality & Safeguarding Integration

Quality ratings and safeguarding benchmarks are stored as network transactions, providing:
- Immutable audit trail
- Distributed validation
- Historical tracking
- Integration with payment validation

### Quality Rating Data Structure
```typescript
{
  providerId: string;
  participantId?: string;
  rating: number; // 1-5
  category: string;
  comment?: string;
  reviewerId: string;
  timestamp: number;
}
```

### Safeguarding Benchmark Data Structure
```typescript
{
  providerId: string;
  participantId?: string;
  benchmark: string;
  score: number; // 0-100
  criteria: Record<string, number>;
  assessedBy: string;
  timestamp: number;
}
```

## Next Steps

1. **Run Database Migration**: `npm run db:push`
2. **Test RPC Endpoint**: Use curl or Postman to test methods
3. **Add Block Creation**: Implement simple block creation logic
4. **Add Transaction Processing**: Process pending transactions into blocks
5. **Add Node Registration**: Implement node registration API

## Future Enhancements

- Full PBFT consensus implementation
- P2P network layer for block propagation
- WebSocket RPC support
- Advanced block validation
- Merkle tree verification
- Network metrics and monitoring
