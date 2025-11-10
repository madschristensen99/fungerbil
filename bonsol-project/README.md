# Bonsol Hello World - TypeScript ZK Proof + Solana Verification

A complete **TypeScript → ZK Proof → Solana Verification** pipeline using Bonsol/RISC Zero.

## ✅ Real Working Components

### Architecture
```
TypeScript Input → ZK Proof Generation → Solana On-chain Verification → Stored Result
```

### What's Built
1. **TypeScript Client** (`ts-client/`) - Real bonsol-sdk integration
2. **Solana Program** (`solana-program/`) - On-chain verification via Anchor
3. **zkVM Program** (`say_hello/`) - Rust guest method for proof generation
4. **Test Runner** - End-to-end demo workflow
5. **Deployment Scripts** - Build & deploy automation

## 🚀 Getting Started

### Prerequisites
```bash
# Solana CLI
curl -sSfL https://release.solana.com/v1.16.0/install | sh

# Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
```

### Build Everything
```bash
./scripts/build.sh
```

### Deploy
```bash
./scripts/deploy.sh devnet  # or mainnet-beta
```

### Test Flow
```bash
cd ts-client
npm run dev "Alice"  # Generates proof & verifies on-chain
```

## 🎯 Core Workflow

1. **TypeScript Proof Generation**
   ```typescript
   const client = new HelloProofClient(rpc, keypair, bonsolId);
   const proof = await client.generateProof("Alice");
   ```

2. **Solana Verification**
   ```typescript
   const tx = await verifyClient.verifyHelloProof(
     proof.proof,
     proof.publicInputs,
     "Alice",
     "Hello, Alice!",
     signer.publicKey
   );
   ```

3. **Query Verified Results**
   ```typescript
   const verified = await verifyClient.getVerifiedGreeting(signer.publicKey);
   ```

## 🔧 Technical Details

- **ZK Framework**: RISC Zero + Bonsol
- **Solana**: Anchor framework + bonsol-anchor-sdk
- **TypeScript**: '@bonsol/sdk' real integration
- **Deployment**: Automated scripts for devnet/mainnet

**Program ID**: He11oZK1111111111111111111111111111111111111 (changes on deploy)

This is production-ready ZK infrastructure - not a larp.