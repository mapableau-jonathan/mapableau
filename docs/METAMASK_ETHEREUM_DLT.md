# MetaMask & Ethereum DLT Integration

The AbilityPay now supports MetaMask wallet integration and direct Ethereum Distributed Ledger Technology (DLT) interactions for payments.

## Overview

This integration allows participants to:
- Connect their MetaMask wallets
- Make payments directly from their Ethereum wallets
- Interact with smart contracts on Ethereum/Polygon networks
- Sign transactions using MetaMask
- Monitor transaction status on-chain

## Architecture

```
Payment Flow:
1. Participant connects MetaMask wallet
2. Initiates payment → PaymentService creates transaction record
3. System prepares transaction data (contract call, gas estimates)
4. Participant signs transaction in MetaMask
5. Transaction broadcast to Ethereum network
6. System monitors transaction confirmation
7. Transaction status updated when confirmed
```

## Components

### 1. MetaMask Adapter (`lib/services/abilitypay/wallet/metamask-adapter.ts`)

Server-side adapter for:
- Address validation
- Transaction signature validation
- Function encoding (transfer, mint)
- Gas estimation utilities
- Network configuration

### 2. Ethereum DLT Service (`lib/services/abilitypay/blockchain/ethereum-dlt-service.ts`)

Direct blockchain interaction service:
- Process MetaMask-signed transactions
- Transaction monitoring and confirmation
- Gas estimation and optimization
- Event listening
- Balance queries

### 3. React Hooks

**`useMetaMask`** - Wallet connection and basic operations:
- Connect/disconnect wallet
- Get account balance
- Switch networks
- Send transactions
- Sign messages

**`useMetaMaskPayment`** - Payment-specific operations:
- Initiate payment
- Process payment transaction
- Complete payment flow

## Configuration

### Environment Variables

```env
# Ethereum Network
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
ETHEREUM_CONTRACT_ADDRESS=0x...

# Or use existing blockchain config
BLOCKCHAIN_NETWORK_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
```

### Supported Networks

- **Ethereum Mainnet** (Chain ID: 1)
- **Sepolia Testnet** (Chain ID: 11155111)
- **Polygon Mainnet** (Chain ID: 137)
- **Mumbai Testnet** (Chain ID: 80001)

## API Endpoints

### Wallet Operations

#### Validate Transaction
```http
POST /api/abilitypay/wallet/metamask?action=validate
Content-Type: application/json

{
  "from": "0x...",
  "to": "0x...",
  "value": "0x0",
  "data": "0x...",
  "gasLimit": "0x5208",
  "gasPrice": "0x4a817c800"
}
```

#### Process MetaMask Transaction
```http
POST /api/abilitypay/wallet/metamask?action=process
Content-Type: application/json

{
  "rawTransaction": "0x...",
  "transactionHash": "0x...",
  "from": "0x..."
}
```

#### Get Transaction Status
```http
GET /api/abilitypay/wallet/metamask?txHash=0x...
```

#### Get Account Balance
```http
GET /api/abilitypay/wallet/metamask?address=0x...
```

### Payment Operations

#### Initiate MetaMask Payment
```http
POST /api/abilitypay/payments/metamask?action=initiate
Content-Type: application/json

{
  "participantId": "user_123",
  "providerId": "provider_456",
  "serviceCode": "01_001_0107_1_1",
  "amount": 100.00,
  "categoryId": "cat_789",
  "fromAddress": "0x..."
}
```

Response:
```json
{
  "transactionId": "txn_123",
  "transaction": {
    "to": "0x...",
    "value": "0x0",
    "data": "0xa9059cbb...",
    "gasLimit": "0x186a0",
    "gasPrice": "0x4a817c800"
  },
  "network": {
    "chainId": 1,
    "name": "homestead",
    "blockNumber": 18000000
  }
}
```

#### Process MetaMask Payment
```http
POST /api/abilitypay/payments/metamask?action=process
Content-Type: application/json

{
  "transactionId": "txn_123",
  "rawTransaction": "0x...",
  "transactionHash": "0x...",
  "from": "0x..."
}
```

## Frontend Usage

### Connect MetaMask Wallet

```typescript
import { useMetaMask } from "@/hooks/useMetaMask";

function PaymentComponent() {
  const { 
    isInstalled, 
    isConnected, 
    account, 
    connect, 
    error 
  } = useMetaMask();

  if (!isInstalled) {
    return <div>Please install MetaMask</div>;
  }

  if (!isConnected) {
    return (
      <button onClick={connect}>
        Connect MetaMask
      </button>
    );
  }

  return (
    <div>
      <p>Connected: {account?.address}</p>
      <p>Network: {account?.networkName}</p>
      <p>Balance: {account?.balance} ETH</p>
    </div>
  );
}
```

### Make Payment with MetaMask

```typescript
import { useMetaMaskPayment } from "@/hooks/useMetaMaskPayment";

function PaymentButton() {
  const { 
    isConnected, 
    account, 
    executePaymentFlow, 
    loading, 
    error 
  } = useMetaMaskPayment();

  const handlePayment = async () => {
    try {
      const result = await executePaymentFlow({
        transactionId: "txn_123",
        participantId: "user_123",
        providerId: "provider_456",
        amount: 100.00,
        serviceCode: "01_001_0107_1_1",
        categoryId: "cat_789",
        fromAddress: account!.address,
      });

      if (result.success) {
        console.log("Payment successful:", result.transactionHash);
      }
    } catch (err) {
      console.error("Payment failed:", err);
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={!isConnected || loading}
    >
      {loading ? "Processing..." : "Pay with MetaMask"}
    </button>
  );
}
```

## Smart Contract Interface

The Ethereum contract should implement:

```solidity
// Token transfer
function transfer(address to, uint256 amount) returns (bool);

// Token minting with rules
function mint(
  address recipient, 
  uint256 amount, 
  TokenRules memory rules
) returns (uint256 tokenId);

// Balance query
function balanceOf(address account) view returns (uint256);

// Token rules retrieval
function getTokenRules(uint256 tokenId) view returns (TokenRules memory);

// Payment validation
function validateSpend(
  uint256 tokenId, 
  string memory serviceCode, 
  address providerId, 
  uint256 amount
) view returns (bool);
```

## Transaction Flow

1. **Initiation**: Participant initiates payment via API
2. **Validation**: NDIS rules validated (price guide, provider, etc.)
3. **Transaction Preparation**: System prepares contract call data
4. **MetaMask Signing**: Participant signs transaction in MetaMask
5. **Broadcast**: Transaction broadcast to Ethereum network
6. **Confirmation**: System monitors for transaction confirmation
7. **Completion**: Transaction status updated, voucher/category updated

## Security Considerations

### 1. Address Validation
- All Ethereum addresses validated before processing
- Checksum validation for address format
- Signature verification for signed transactions

### 2. Transaction Validation
- Gas estimation before submission
- Balance checks before transaction
- Nonce management

### 3. Access Control
- Users can only initiate payments for their own accounts
- Transaction signatures verified server-side
- Participant address must match signed transaction

### 4. Network Security
- Supported networks whitelist
- Chain ID validation
- Network switching requires user confirmation

## Gas Optimization

The system provides:
- Automatic gas estimation
- Gas price optimization
- Transaction batching (future enhancement)
- Layer 2 support (Polygon)

## Error Handling

Common errors and solutions:

### "MetaMask is not installed"
- User needs to install MetaMask browser extension
- Provide installation link

### "User rejected the request"
- User cancelled transaction in MetaMask
- Allow retry

### "Insufficient funds"
- User doesn't have enough ETH for gas + transaction
- Show balance and required amount

### "Network mismatch"
- User is on wrong network
- Prompt to switch network or add network

### "Transaction failed"
- Transaction reverted on-chain
- Check contract state and error logs

## Monitoring

### Transaction Status

Monitor transactions:
```typescript
// Get transaction receipt
const receipt = await ethereumDLTService.getTransactionReceipt(txHash);

// Wait for confirmations
const receipt = await ethereumDLTService.waitForConfirmation(
  txHash, 
  confirmations: 3
);
```

### Event Listening

Listen for contract events:
```typescript
await ethereumDLTService.listenForEvents(
  { address: contractAddress },
  (event) => {
    console.log("Payment processed:", event);
  }
);
```

## Testing

### Test Networks

Use Sepolia testnet for testing:
- Chain ID: 11155111
- Get test ETH from faucet
- Deploy test contracts

### Test Flow

1. Connect MetaMask to Sepolia testnet
2. Get test ETH from faucet
3. Deploy test contract
4. Test payment flow
5. Verify transaction on Etherscan

## Future Enhancements

- **Multi-signature Support**: Require multiple signatures for large payments
- **Layer 2 Integration**: Support for Optimism, Arbitrum
- **Gasless Transactions**: Meta-transactions for better UX
- **Batch Payments**: Multiple payments in single transaction
- **Payment Scheduling**: Scheduled recurring payments
- **Wallet Connect**: Support for WalletConnect protocol
- **Hardware Wallet Support**: Ledger, Trezor integration

## Troubleshooting

### MetaMask Not Detected
- Ensure MetaMask extension is installed and enabled
- Check browser compatibility
- Try refreshing the page

### Transaction Stuck
- Check gas price (may be too low)
- Check network congestion
- Try increasing gas price

### Wrong Network
- User needs to switch to correct network
- Provide network switching UI
- Add network if not in MetaMask

### Transaction Reverted
- Check contract state
- Verify transaction parameters
- Check contract logs for revert reason

## Resources

- [MetaMask Documentation](https://docs.metamask.io/)
- [Ethereum JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Ethers.js Documentation](https://docs.ethers.io/)
- [Ethereum Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
