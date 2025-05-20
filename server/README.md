# Fungerbil: Monero-EVM Atomic Swap Server

## Overview

Fungerbil is a production-ready atomic swap service that enables trustless exchanges between Monero (XMR) and EVM-compatible tokens (USDC, etc.) following the Athanor protocol. This server handles all aspects of the atomic swap process, including key generation, transaction verification, and swap execution.

## Features

- **Trustless Atomic Swaps**: Complete XMR ↔ USDC swaps without requiring trust between parties
- **Real Monero Transactions**: Uses actual Monero blockchain transactions, not simulations
- **Independent Verification**: Provides multiple ways for users to verify transactions
- **Secure Key Management**: Proper handling of private keys and secure wallet operations
- **Comprehensive API**: RESTful API for integrating with frontend applications

## Transaction Verification

Fungerbil provides multiple methods for transaction verification:

1. **Block Explorer Links**: Each transaction includes links to LocalMonero block explorer for independent verification
2. **Server-Side Verification**: The server verifies transactions using view-only wallets
3. **Client-Side Verification**: Users can verify transactions using their own wallet software

## Architecture

The system consists of several key components:

- **Monero Key Exchange**: Handles Monero key generation and address creation
- **Swap Handlers**: Manages the swap lifecycle for both XMR→USDC and USDC→XMR swaps
- **API Server**: Provides RESTful endpoints for client applications
- **Verification Service**: Enables independent verification of transactions

## API Endpoints

### Monero Operations

- `POST /api/monero/send-to-address`: Send XMR to a specified address
  - Returns transaction hash and verification links

### USDC to XMR Swaps

- `POST /api/swaps/usdc-to-xmr`: Create a new USDC to XMR swap
- `POST /api/swaps/usdc-to-xmr/:swapId/ready`: Set a swap as ready after XMR verification
- `POST /api/swaps/usdc-to-xmr/:swapId/claim`: Claim USDC from a swap
- `POST /api/swaps/usdc-to-xmr/:swapId/refund`: Refund a swap after timeout

### XMR to USDC Swaps

- `POST /api/swaps/xmr-to-usdc`: Create a new XMR to USDC swap
- `POST /api/swaps/xmr-to-usdc/:swapId/ready`: Set a swap as ready
- `POST /api/swaps/xmr-to-usdc/:swapId/claim`: Claim XMR from a swap

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/madschristensen99/fungerbil.git
   cd fungerbil/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (create a `.env` file):
   ```
   MONERO_WALLET_PASSWORD=your_wallet_password
   MONERO_WALLET_SEED=your_wallet_seed_phrase
   MONERO_DAEMON_URI=http://node.monerooutreach.org:18081
   EVM_RPC_URL=https://mainnet.infura.io/v3/your_infura_key
   PORT=3000
   ```

4. Start the server:
   ```bash
   node swap-server.js
   ```

## Testing

To run the test suite:

```bash
node test-swap-server.js
```

This will execute a series of tests that validate the atomic swap functionality using real transactions on the Monero network.

## Security Considerations

- **Private Keys**: Never share your Monero seed phrase or private keys
- **Transaction Verification**: Always verify transactions using multiple methods
- **Smart Contract Audits**: The EVM smart contracts should be audited before production use

## License

MIT

## Acknowledgements

- [Monero-TS](https://github.com/woodser/monero-ts) - JavaScript library for Monero
- [Athanor Protocol](https://github.com/AthanorLabs/atomic-swap) - Atomic swap protocol specification