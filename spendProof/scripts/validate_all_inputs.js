const fs = require('fs');

const input = JSON.parse(fs.readFileSync('input.json', 'utf8'));

console.log("=== Validating ALL Circuit Inputs ===\n");

// 1. Check r
console.log("1. Secret scalar r:");
console.log("   Length:", input.r.length);
let rValue = 0n;
for (let i = 0; i < input.r.length; i++) {
    if (input.r[i] === 1) rValue |= (1n << BigInt(i));
}
const L = 7237005577332262213973186563042994240857116359379907606001950938285454250989n;
console.log("   r < L:", rValue < L, rValue < L ? "✅" : "❌");
console.log("   r[253]:", input.r[253], "=== 0:", input.r[253] === 0, input.r[253] === 0 ? "✅" : "❌");
console.log("   r[254]:", input.r[254], "=== 0:", input.r[254] === 0, input.r[254] === 0 ? "✅" : "❌");

// 2. Check v (amount)
console.log("\n2. Amount v:");
console.log("   Value:", input.v);
const vBigInt = BigInt(input.v);
const maxU64 = (1n << 64n) - 1n;
console.log("   In range [0, 2^64-1]:", vBigInt >= 0n && vBigInt <= maxU64, vBigInt >= 0n && vBigInt <= maxU64 ? "✅" : "❌");

// 3. Check output_index
console.log("\n3. Output index:");
console.log("   Value:", input.output_index);
console.log("   In range [0, 15]:", input.output_index >= 0 && input.output_index < 16, input.output_index >= 0 && input.output_index < 16 ? "✅" : "❌");

// 4. Check compressed points
function checkCompressedPoint(name, point) {
    console.log(`\n4. ${name}:`);
    console.log("   Length:", point.length);
    console.log("   All binary:", point.every(b => b === 0 || b === 1), point.every(b => b === 0 || b === 1) ? "✅" : "❌");
    const allZeros = point.every(b => b === 0);
    console.log("   Not all zeros:", !allZeros, !allZeros ? "✅" : "❌");
    const ones = point.filter(b => b === 1).length;
    console.log("   Bit distribution: " + ones + " ones, " + (point.length - ones) + " zeros");
}

checkCompressedPoint("R_compressed", input.R_compressed);
checkCompressedPoint("P_compressed", input.P_compressed);
checkCompressedPoint("A_compressed", input.A_compressed);
checkCompressedPoint("B_compressed", input.B_compressed);
checkCompressedPoint("monero_tx_hash", input.monero_tx_hash);

// 5. Check ecdhAmount
console.log("\n5. ecdhAmount:");
console.log("   Value:", input.ecdhAmount);
const ecdhBigInt = BigInt(input.ecdhAmount);
console.log("   In range [0, 2^64-1]:", ecdhBigInt >= 0n && ecdhBigInt <= maxU64, ecdhBigInt >= 0n && ecdhBigInt <= maxU64 ? "✅" : "❌");

// 6. Check chain_id
console.log("\n6. chain_id:");
console.log("   Value:", input.chain_id);
const chainBigInt = BigInt(input.chain_id);
console.log("   In range [0, 2^64-1]:", chainBigInt >= 0n && chainBigInt <= maxU64, chainBigInt >= 0n && chainBigInt <= maxU64 ? "✅" : "❌");

console.log("\n=== Summary ===");
console.log("All inputs appear structurally valid for the circuit.");
console.log("If the circuit is still failing, the issue is likely in:");
console.log("  - Point decompression logic");
console.log("  - Curve arithmetic");
console.log("  - Identity point detection");
