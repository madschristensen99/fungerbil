# Rapidsnark Integration Guide

This guide explains how to use **rapidsnark** for 10-50x faster proof generation compared to snarkjs.

## Why Rapidsnark?

- **C++ implementation** with assembly optimizations (ADX/BMI2 instructions)
- **Parallel FFTs** and multiexponentiations
- **10-50x faster** than JavaScript snarkjs prover
- Essential for circuits with 3M+ constraints

## Installation

### Option 1: Build from source

```bash
git clone https://github.com/iden3/rapidsnark.git
cd rapidsnark
npm install
git submodule init
git submodule update
npx task createFieldSources
npx task buildPistache
npx task buildProver
```

The prover binary will be at: `build/prover`

### Option 2: Use pre-built binary

Download from: https://github.com/iden3/rapidsnark/releases

## Workflow

### 1. Compile Circuit with C++ Witness Generator

```bash
# Compile with both WASM and C++ witness generators
npm run compile:optimized

# Or compile with C++ only (faster witness generation)
npm run compile:cpp
```

This generates:
- `monero_bridge.r1cs` - R1CS constraint system
- `monero_bridge_js/` - WASM witness calculator (slower)
- `monero_bridge_cpp/` - C++ witness calculator (faster)

### 2. Generate Witness (C++ - Fast)

```bash
cd monero_bridge_cpp
./monero_bridge input.json witness.wtns
```

**Witness generation time:** ~1-5 seconds (vs 10-30s with WASM)

### 3. Setup (One-time)

```bash
# Download Powers of Tau (if not already done)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_22.ptau

# Generate proving key
snarkjs groth16 setup monero_bridge.r1cs powersOfTau28_hez_final_22.ptau monero_bridge_0000.zkey

# Contribute to ceremony (adds randomness)
snarkjs zkey contribute monero_bridge_0000.zkey monero_bridge_final.zkey --name="First contribution" -v

# Export verification key
snarkjs zkey export verificationkey monero_bridge_final.zkey verification_key.json
```

### 4. Prove with Rapidsnark (FAST!)

```bash
# Using rapidsnark (10-50x faster)
/path/to/rapidsnark/build/prover monero_bridge_final.zkey witness.wtns proof.json public.json
```

**Proof generation time:**
- **snarkjs:** 3-10 minutes
- **rapidsnark:** 10-60 seconds ⚡

### 5. Verify

```bash
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Performance Comparison

| Tool | Witness Gen | Proof Gen | Total | Memory |
|------|-------------|-----------|-------|--------|
| snarkjs (WASM) | 10-30s | 3-10 min | ~10 min | 32-64 GB |
| rapidsnark (C++) | 1-5s | 10-60s | ~1 min | 32-64 GB |
| **Speedup** | **5-10x** | **10-30x** | **~10x** | Same |

## Hardware Recommendations

### Minimum
- CPU: 8 cores, AVX2 support
- RAM: 32 GB
- Storage: 10 GB SSD

### Recommended
- CPU: 16+ cores, AVX-512 support
- RAM: 64 GB
- Storage: 20 GB NVMe SSD

### Optimal
- CPU: AMD Ryzen 9 / Intel i9 (AVX-512, BMI2)
- RAM: 128 GB
- Storage: NVMe SSD
- OS: Linux (better performance than Windows/Mac)

## Circuit Optimizations Applied

1. ✅ **Fixed-base scalar multiplication** for R = r·G
   - Hardcoded base point G allows compiler optimizations
   - Estimated: 10-20% constraint reduction

2. ✅ **Removed unused compressS** operation
   - Saved: ~692 constraints

3. ✅ **C++ witness generator** enabled
   - 5-10x faster witness calculation

4. ⚠️ **Future optimization:** Precompute 2^i·G offline
   - Potential: Additional 30-40% constraint reduction
   - Requires: Offline precomputation script

## Troubleshooting

### Out of Memory
- Increase swap space: `sudo fallocate -l 64G /swapfile`
- Use a machine with more RAM
- Consider using PLONK instead of Groth16 (lower memory)

### Slow Performance
- Check CPU supports AVX2: `grep avx2 /proc/cpuinfo`
- Compile rapidsnark with optimizations: `-O3 -march=native`
- Close other applications to free RAM

### Compilation Errors
- Update Node.js: `nvm install 18`
- Update circom: `npm install -g circom`
- Check dependencies: `npm install`

## Production Deployment

For production, use a proving server:

```
Client (Browser/Mobile)
  ↓ (sends transaction data)
Proving Server (64GB RAM, AVX-512)
  ↓ (generates proof with rapidsnark)
Client receives proof
  ↓ (submits to smart contract)
Ethereum/Arbitrum
```

**Security note:** Proving server sees witness data (secret key, amount). Use:
- Trusted server infrastructure
- Multi-party computation (MPC)
- Trusted Execution Environment (TEE)

## References

- Rapidsnark: https://github.com/iden3/rapidsnark
- Circom: https://docs.circom.io/
- snarkjs: https://github.com/iden3/snarkjs
