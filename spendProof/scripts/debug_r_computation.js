// Debug script to verify R = r·G computation matches circuit expectations
const { Point } = require("@noble/ed25519");
const { sha512 } = require("@noble/hashes/sha512");
const { bytesToHex, hexToBytes } = require("@noble/hashes/utils");
const fs = require("fs");

// Required for @noble/ed25519
const ed = require("@noble/ed25519");
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

function scalarToBits(scalar, numBits = 255) {
    const bits = [];
    let s = scalar;
    for (let i = 0; i < numBits; i++) {
        bits.push((s & 1n).toString());
        s >>= 1n;
    }
    return bits; // LSB first
}

function pointToCompressedBigInt(point) {
    // Get compressed hex (32 bytes, little-endian y-coordinate with sign bit)
    const compressedHex = point.toHex();
    const compressed = hexToBytes(compressedHex);
    
    // Convert to BigInt (little-endian)
    let result = 0n;
    for (let i = 0; i < 32; i++) {
        result |= BigInt(compressed[i]) << BigInt(i * 8);
    }
    
    // Clear the top bit (bit 255) to get 255-bit value for Bits2Num(255)
    return result & ((1n << 255n) - 1n);
}

async function testRComputation() {
    console.log("=== Testing R = r·G Computation ===\n");
    
    // Test 1: r = 1 (R should equal G)
    console.log("Test 1: r = 1 (R should equal basepoint G)");
    const r1 = 1n;
    const R1 = Point.BASE.multiply(r1);
    const R1_compressed = pointToCompressedBigInt(R1);
    const r1_bits = scalarToBits(r1, 255);
    
    console.log("  r (scalar):", r1.toString());
    console.log("  R (hex):", R1.toHex());
    console.log("  R_compressed (decimal):", R1_compressed.toString());
    console.log("  r_bits[0] (should be 1):", r1_bits[0]);
    console.log("  r_bits[1] (should be 0):", r1_bits[1]);
    
    // Test 2: Use the actual transaction secret key
    const TX_SECRET_KEY = "9be32769af6e99d0fef1dcddbef68f254004e2eb06e8f712c01a63d235a5410c";
    console.log("\nTest 2: Actual transaction secret key");
    
    const r_bytes = hexToBytes(TX_SECRET_KEY);
    let r_scalar = 0n;
    for (let i = 0; i < 32; i++) {
        r_scalar |= BigInt(r_bytes[i]) << BigInt(i * 8);
    }
    
    console.log("  r (hex):", TX_SECRET_KEY);
    console.log("  r (scalar):", r_scalar.toString(16));
    
    // Compute R = r·G
    const R = Point.BASE.multiply(r_scalar);
    const R_compressed = pointToCompressedBigInt(R);
    const r_bits = scalarToBits(r_scalar, 255);
    
    console.log("  Computed R (hex):", R.toHex());
    console.log("  R_compressed (decimal):", R_compressed.toString());
    
    // Expected R from blockchain (for subaddress tx, this will be different!)
    const BLOCKCHAIN_R = "9502786562d2ed326c673ba4e490540ea6b54e7c18577c2b36358de40e84bdc0";
    console.log("\n  Blockchain R (hex):", BLOCKCHAIN_R);
    console.log("  Match:", R.toHex() === BLOCKCHAIN_R ? "YES" : "NO");
    
    if (R.toHex() !== BLOCKCHAIN_R) {
        console.log("\n  ⚠️  MISMATCH DETECTED!");
        console.log("  This is expected for SUBADDRESS transactions.");
        console.log("  For subaddresses, R on blockchain = r·D (not r·G)");
        console.log("  where D is the subaddress spend public key.");
    }
    
    // Verify bit conversion round-trip
    let r_reconstructed = 0n;
    for (let i = 254; i >= 0; i--) {
        r_reconstructed = (r_reconstructed << 1n) + BigInt(r_bits[i]);
    }
    console.log("\n  Bit conversion round-trip:", r_reconstructed === r_scalar ? "PASS ✅" : "FAIL ❌");
    
    // Generate test input for circuit
    const testInput = {
        r: r_bits,
        v: "931064529072",
        output_index: "0",
        R_compressed: R_compressed.toString(),
        P_compressed: "0", // Placeholder
        ecdhAmount: "0",
        A_compressed: "0",
        B_compressed: "0",
        monero_tx_hash: "0"
    };
    
    fs.writeFileSync("test_input_debug.json", JSON.stringify(testInput, null, 2));
    console.log("\n✅ Test input saved to test_input_debug.json");
    console.log("\nTo test: snarkjs wtns calculate build_v3/monero_bridge_v3_js/monero_bridge_v3.wasm test_input_debug.json test.wtns");
}

testRComputation().catch(console.error);
