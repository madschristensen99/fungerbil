# Wrapped Monero Bridge (wXMR) using Arcium MPC

A trustless bridge for wrapping Monero (XMR) using Arcium's Multi-Party Computation.

## 🎯 Concept

This bridge allows users to:
1. **Deposit XMR** → Get wXMR on Solana
2. **Burn wXMR** → Get XMR back (private key revealed)

The critical innovation: **Monero private keys are generated and stored encrypted in Arcium MPC**. They are NEVER revealed until the user burns their wXMR.

## 🔐 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCIUM MPC LAYER                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Encrypted Monero Private Keys (Never Revealed)      │  │
│  │  - Generated inside MPC                               │  │
│  │  - Stored encrypted                                   │  │
│  │  - Only revealed on burn                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↓ Derive                              ↓ Reveal on Burn
         ↓                                     ↓
┌────────────────────┐              ┌────────────────────────┐
│  Public Keys       │              │  Private Key           │
│  (For Deposits)    │              │  (For Withdrawals)     │
└────────────────────┘              └────────────────────────┘
```

### Flow Diagram

#### MINT (Deposit XMR → Get wXMR)

```
User                    Bridge                  Arcium MPC
 │                        │                         │
 │  1. Request Address    │                         │
 ├───────────────────────>│                         │
 │                        │  Generate Key           │
 │                        ├────────────────────────>│
 │                        │  Enc(PrivKey)           │
 │                        │<────────────────────────┤
 │                        │  Derive PubKey          │
 │                        ├────────────────────────>│
 │                        │  PubKey (revealed)      │
 │  Address (PubKey)      │<────────────────────────┤
 │<───────────────────────┤                         │
 │                        │                         │
 │  2. Send XMR to addr   │                         │
 │  ────────────────────> │                         │
 │                        │                         │
 │  3. Submit ZK Proof    │                         │
 ├───────────────────────>│                         │
 │                        │  Verify & Mint          │
 │                        ├────────────────────────>│
 │                        │  MintResult             │
 │  wXMR Minted ✅        │<────────────────────────┤
 │<───────────────────────┤                         │
```

#### BURN (Burn wXMR → Get XMR)

```
User                    Bridge                  Arcium MPC
 │                        │                         │
 │  1. Burn wXMR          │                         │
 ├───────────────────────>│                         │
 │                        │  Process Burn           │
 │                        ├────────────────────────>│
 │                        │  🔑 REVEAL PrivKey      │
 │  Private Key 🔓        │<────────────────────────┤
 │<───────────────────────┤                         │
 │                        │                         │
 │  2. Use PrivKey to     │                         │
 │     withdraw XMR       │                         │
 │  ────────────────────> Monero Network            │
```

## 📋 Encrypted Functions

### 1. **`generate_monero_key`** - Generate Private Key in MPC
```rust
pub fn generate_monero_key(mxe: Mxe, seed: u64) -> Enc<Mxe, MoneroPrivateKey>
```
- Generates a random Monero private key
- Key is NEVER revealed (stays encrypted in MPC)
- Only revealed when user burns wXMR

### 2. **`derive_public_key`** - Derive Public Key
```rust
pub fn derive_public_key(private_key: Enc<Mxe, MoneroPrivateKey>) 
    -> Enc<Mxe, MoneroPublicKey>
```
- Derives public key from encrypted private key
- Uses elliptic curve operations on encrypted data
- Public key can be safely revealed to users

### 3. **`reveal_public_key`** - Get Deposit Address
```rust
pub fn reveal_public_key(public_key: Enc<Mxe, MoneroPublicKey>) -> [u8; 32]
```
- Reveals the public key for deposits
- Safe to share - users send XMR to this address

### 4. **`process_mint`** - Mint wXMR
```rust
pub fn process_mint(
    deposit: Enc<Shared, DepositRequest>,
    bridge_state: Enc<Mxe, BridgeState>,
) -> (Enc<Shared, MintResult>, Enc<Mxe, BridgeState>)
```
- Verifies deposit proof (ZK proof in production)
- Mints wXMR if proof is valid
- Updates bridge state

### 5. **`process_burn`** - Burn wXMR and Reveal Key 🔑
```rust
pub fn process_burn(
    burn_req: Enc<Shared, BurnRequest>,
    private_key: Enc<Mxe, MoneroPrivateKey>,
    bridge_state: Enc<Mxe, BridgeState>,
) -> (Enc<Shared, BurnResult>, Enc<Mxe, BridgeState>)
```
- **CRITICAL FUNCTION**: Burns wXMR and reveals the private key
- User gets the Monero private key to withdraw XMR
- Updates bridge state

### 6. **`init_bridge_state`** - Initialize Bridge
```rust
pub fn init_bridge_state(mxe: Mxe) -> Enc<Mxe, BridgeState>
```
- Initializes bridge state tracking

### 7. **`get_bridge_stats`** - Get Statistics
```rust
pub fn get_bridge_stats(bridge_state: Enc<Mxe, BridgeState>) 
    -> (u64, u64, u32)
```
- Returns: (total_locked_xmr, total_minted_wxmr, active_deposits)

## 🔒 Security Model

### What's Encrypted
- ✅ Monero private keys (Enc<Mxe, MoneroPrivateKey>)
- ✅ Bridge state (Enc<Mxe, BridgeState>)
- ✅ Deposit/burn requests (Enc<Shared, ...>)

### What's Revealed
- ✅ Public keys (for deposits) - SAFE
- ✅ Bridge statistics - SAFE
- ✅ Private key ONLY on burn - INTENTIONAL

### Trust Model
- **No single party** has access to private keys
- **MPC network** collectively holds encrypted keys
- **Only the burner** gets the private key revealed
- **Cryptographically enforced** - can't be bypassed

## 🚀 Building

```bash
cargo build --release
```

## 📊 Data Structures

### MoneroPrivateKey
```rust
pub struct MoneroPrivateKey {
    key_bytes: [u8; 32],  // 32-byte Ed25519 private key
}
```

### MoneroPublicKey
```rust
pub struct MoneroPublicKey {
    pub_key_bytes: [u8; 32],  // 32-byte Ed25519 public key
}
```

### DepositRequest
```rust
pub struct DepositRequest {
    amount: u64,
    proof_valid: bool,  // ZK proof verification result
}
```

### BurnRequest
```rust
pub struct BurnRequest {
    amount: u64,
    wxmr_holder: [u8; 32],  // Public key of wXMR holder
}
```

### BridgeState
```rust
pub struct BridgeState {
    total_locked_xmr: u64,
    total_minted_wxmr: u64,
    active_deposits: u32,
}
```


## 💡 Use Cases

### For Users
- **Privacy**: Bridge XMR to Solana without KYC
- **DeFi**: Use XMR in Solana DeFi ecosystem
- **Liquidity**: Trade XMR on Solana DEXs

### For Developers
- **Template**: Build other privacy-preserving bridges
- **MPC Pattern**: Learn encrypted key management
- **ZK Integration**: Combine ZK proofs with MPC

## 🎓 Key Innovations

1. **Trustless Key Generation**: Keys generated in MPC, never exposed
2. **Selective Revelation**: Keys only revealed to rightful owner
3. **Cryptographic Enforcement**: Can't extract keys without burning
4. **Verifiable Deposits**: ZK proofs ensure XMR was actually sent

## 🔗 Resources

- [Arcium Docs](https://docs.arcium.com/)
- [Monero Cryptography](https://www.getmonero.org/resources/moneropedia/)
- [Groth16 Proofs](https://eprint.iacr.org/2016/260.pdf)
- [Abridge Framework](https://docs.arcium.com/) (coming soon)

---

**⚠️ DISCLAIMER**: This is a proof-of-concept. DO NOT use in production without proper cryptographic implementation and security audits.

**🎉 This demonstrates the power of Arcium MPC for trustless bridges!**
