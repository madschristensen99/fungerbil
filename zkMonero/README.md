# zkMonero - ZK-proof that a Monero payment happened

A zero-knowledge proof system that allows users to prove they've made a Monero payment without revealing sensitive transaction details.

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Circuit
```bash
npm run build:circuits
```

### 3. Generate Keys
First download the powers-of-tau file:
```bash
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau
```

Then generate proving and verification keys:
```bash
npm run setup
npm run zkey
```

### 4. Use in Browser

```typescript
import { proveMoneroPayment } from './client/proveMoneroPayment';

// Parameters copied from Monero wallet
const proofCallData = await proveMoneroPayment(
  'tx_key_from_wallet',     // 64 hex chars (private)
  'tx_hash_from_wallet',    // 64 hex chars (public)
  'monero_recipient_addr', // Base58 address (public)
  1.5                       // Expected amount in XMR
);

// Submit to Solana or Ethereum
await submitProof(proofCallData);
```

## 🏗️ Repository Structure

```
zkMonero/
├── circuits/
│   └── monero_payment.circom    # Main ZK circuit
├── client/
│   └── proveMoneroPayment.ts    # Browser client
├── onchain/
│   ├── contracts/
│   │   └── MoneroPaymentVerifier.sol  # Solidity verifier
│   └── programs/monero-zk-verify/     # Solana Anchor program
└── package.json
```

## 📋 Wallet Integration

### Supported Wallets
| Wallet | How to get parameters |
|--------|------------------------|
| **Feather** | History → rt-click tx → "Copy Tx key", "Copy Tx ID" |
| **Monero GUI** | History → double-click tx → "Copy tx key", "Copy Tx ID" |
| **Cake Wallet** | Transactions → pick tx → ⋮ → Advanced → "Tx key" & "Tx ID" |
| **CLI** | `get_tx_key <txid>` and `show_transfers` |

### Required Parameters
- **txKey**: 64-hex sender secret (private - never leaves browser)
- **txHash**: 64-hex transaction ID (public)
- **destAddr**: Recipient address (public)
- **amount**: Expected XMR amount (public)

## 🔐 Security Notes

- **txKey never leaves the browser** - stays in WASM memory only
- **Replay protection** - Each proof can only be used once
- **No sensitive data exposure** - Only public data goes on-chain
- **Client-side generation** - No server required

## 🚀 Deployment

### Ethereum/Solidity
```bash
cd onchain/contracts
npx hardhat compile
npx hardhat run --network sepolia scripts/deploy.js
```

### Solana/Anchor
```bash
cd onchain/programs/monero-zk-verify
anchor build
anchor deploy
```

## 📄 License

MIT License - see LICENSE file for details.