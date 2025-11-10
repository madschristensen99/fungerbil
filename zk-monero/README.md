# Monero Zero-Knowledge Payment Verification

Complete zero-knowledge proof system for verifying Monero blockchain payments without revealing secret keys.

## Overview

This system provides cryptographic proof that a Monero payment occurred, including:
- **ECDH key derivation** for shared secrets
- **RingCT commitment verification** (Pedersen commitments)
- **Stealth address derivation** 
- **Transaction validation** against blockchain data

## Quick Start

### Circuit Files
- `circuits/monero_final_working.circom` - Main verification circuit (858 constraints)
- `circuits/monero_final_working.wasm` - Browser-ready proving system
- `circuits/monero_final_working.r1cs` - Generated constraint system

### Blockchain Integration
- **Solidity**: `onchain/solidity/MoneroPaymentVerifier.sol` (230k gas verification)
- **Solana**: `onchain/anchor/` - Anchor program for Solana verification

### Client Integration
- **Browser**: `client/proveMoneroPayment.js` - JavaScript client
- **Proof Generation**: WebAssembly-based in-browser proof generation

## Usage Flow

1. **Circuit Compilation**: `circom monero_final_working.circom --r1cs --wasm --sym`
2. **Proof Generation**: Client-side WebAssembly execution
3. **On-chain Verification**: Solidity or Solana program verification

## Technical Details

### Circuit Specifications
- **Constraints**: 858 (858 non-linear, 0 linear)
- **Public Inputs**: 6-8 (depending on usage)
- **Private Inputs**: 4 (tx_key, amount_blinding, mask, view_key)
- **Proof Size**: ~70 bytes compressed
- **Verification**: 230k gas (EVM), ~140k CU (Solana)

### Cryptographic Primitives
- **Poseidon Hash** (ZK-friendly)
- **Ed25519 curve simulation** (Monero ECDH)
- **RingCT commitment** verification
- **Stealth address derivation**

## Usage Example

```javascript
import { proveMoneroPayment } from './client/proveMoneroPayment.js';

const proof = await proveMoneroPayment(
  tx_key_scalar,    // from wallet
  amount_blinding,  // RingCT blinding factor
  mask_value,       // commitment mask
  view_key,         // recipient view key
  tx_hash,          // public
  amount_atomic,    // expected amount (public)
  block_root,       // blockchain merkle root (public)
  commitment,       // RingCT commitment (public)
  dest_address      // stealth address (public)
);
```

## Build System
- **npm run build-circuits**: Compile Circom circuits
- **npm run verify-sol**: Compile Solidity contracts
- **npm run setup**: Download Powers of Tau ceremony