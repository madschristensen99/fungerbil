# Monero ZK Proof System - TDD Implementation

## Current Status
✅ **Test-driven development setup complete** - All 27 tests are currently failing as expected.

## Required Stagenet Data
To make the tests pass and generate valid zk proofs, we need the following data from your Monero stagenet wallet:

### **Required Transaction Data**
Each field must match the exact format specified:

1. **Block Height** (number)
   - Format: Positive integer
   - Range: 1 to current stagenet height (as of Nov 2024: ~2,400,000)
   - Example: `1548635`

2. **Transaction Secret Key** (32 bytes, hex string)
   - Format: 64 hex characters (0-9, a-f)
   - Starting with: Can be any 64 hex chars
   - Example: `a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd`

3. **Transaction Hash** (32 bytes, hex string)
   - Format: 64 hex characters
   - Starting with: Can be any 64 hex chars
   - Example: `7be023ac6982d9b3e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2`

4. **Transfer Amount** (atomic units)
   - Format: Positive integer in piconero (1 XMR = 1,000,000,000,000 piconero)
   - Range: 1 to 18,446,744,073,709,551,615 (max 2^64-1)
   - Example: `1000000000000` (1 XMR)

5. **Destination Address** (95 characters)
   - Format: Must start with `9` for stagenet addresses
   - Length: Exactly 95 base58 characters
   - Example: `9tun7VYAVwa9Pqpu2k8HHdqXz6h1bP9FWLQ76dC8hxv3vXkxZVJcvUyMQXu2xhvDkmB4B51sX8dvFm7zWbbzJYm9ABvYwVBnt`

6. **Block Header Hash** (32 bytes, hex string)
   - Format: 64 hex characters
   - Get block: Use curl command below

## **How to Get Your Stagenet Data**

### **1. Transaction Details**
```bash
# List recent transactions
monero-wallet-cli --stagenet --wallet-file your_wallet
> show_transfers

# Get specific transaction info
> get_tx_key <txid>
> show_transfer <txid>
```

### **2. Block Header Hash**
```bash
# Get block header for a specific height
curl -X POST http://node.monerodevs.org:38089/json_rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "0",
    "method": "get_block_header_by_height",
    "params": {
      "height": <your_block_height>
    }
  }' | jq '.result.block_header.hash'
```

### **3. Transaction Info via RPC**
```bash
# Get transaction details
curl -X POST http://node.monerodevs.org:38089/json_rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "0",
    "method": "get_transactions",
    "params": {
      "txs_hashes": ["<your_tx_hash>"],
      "decode_as_json": true
    }
  }'
```

## **Test Coverage**
- ✅ **27 comprehensive tests** designed to fail with invalid data
- ✅ **Input validation** for all 6 data fields
- ✅ **Format checking** (hex, length, range)
- ✅ **Stagenet compliance** checks
- ✅ **Consistency verification** between fields
- ✅ **Proof verification** with tamper detection

## **Next Steps**

1. **Get real stagenet transaction data** using commands above
2. **Update test expected values** to match your actual data
3. **Implement working zk proof generation** using your valid inputs
4. **Run end-to-end proof verification**

## **Quick Validation Commands**

Once you have the data, you can quickly verify format:

```bash
# Test a single piece of data
cd zk-proofs
npm test monero-zk.test.ts -t "valid format"

# Check all validation tests
npm test
```

## **Expected Response Format**

When you provide your stagenet data, please use this exact format:

```json
{
  "blockHeight": 1548635,
  "txSecret": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
  "txHash": "7be023ac6982d9b3e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2",
  "amount": 1000000000000,
  "destination": "9tun7VYAVwa9Pqpu2k8HHdqXz6h1bP9FWLQ76dC8hxv3vXkxZVJcvUyMQXu2xhvDkmB4B51sX8dvFm7zWbbzJYm9ABvYwVBnt",
  "blockHeader": "f6e9c0ff328b1f3a50cb9d4ca88e1e24ad45cbbdea4a0bd3f50261f123456789"
}
```

Ready for your stagenet data! 🎯