const fs = require('fs');

const input = JSON.parse(fs.readFileSync('input.json', 'utf8'));

// Ed25519 L in bits (253 bits, little-endian)
const L_bits = [
    1,0,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,0,1,0,1,1,1,1,1,1,0,0,1,0,1,0,
    0,1,0,0,0,1,1,0,0,0,0,1,1,0,0,1,0,1,0,0,0,0,1,1,0,1,0,0,0,0,1,0,
    0,1,1,0,1,0,1,1,0,0,1,1,1,0,0,1,1,1,1,1,0,1,0,0,1,0,0,1,1,0,1,1,
    0,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,1,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0
];

console.log("=== Debugging LessThanL ===\n");

console.log("Comparing r vs L bit by bit (from MSB to LSB):");
console.log("Position | r[i] | L[i] | Status");
console.log("---------|------|------|-------");

let foundDiff = false;
let result = null;

for (let i = 252; i >= 0 && !foundDiff; i--) {
    const r_bit = input.r[i];
    const l_bit = L_bits[i];
    
    if (r_bit < l_bit) {
        console.log(`   ${i.toString().padStart(3)}   |  ${r_bit}   |  ${l_bit}   | r < L (FOUND!)`);
        foundDiff = true;
        result = "r < L";
    } else if (r_bit > l_bit) {
        console.log(`   ${i.toString().padStart(3)}   |  ${r_bit}   |  ${l_bit}   | r > L (FOUND!)`);
        foundDiff = true;
        result = "r >= L";
    } else if (i >= 248) {  // Only show last few equal bits
        console.log(`   ${i.toString().padStart(3)}   |  ${r_bit}   |  ${l_bit}   | equal (continue)`);
    }
}

if (!foundDiff) {
    result = "r == L";
}

console.log("\n✅ Result:", result);
console.log("Expected: r < L (should return true)");
console.log("Circuit should:", result === "r < L" ? "PASS ✅" : "FAIL ❌");
