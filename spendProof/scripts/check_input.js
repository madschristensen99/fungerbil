const fs = require('fs');

const input = JSON.parse(fs.readFileSync('input.json', 'utf8'));

console.log("Checking input.json for validity...\n");

// Check r
console.log("=== Checking r (secret scalar) ===");
console.log("Length:", input.r.length);
console.log("r[253]:", input.r[253]);
console.log("r[254]:", input.r[254]);

// Convert r to BigInt
let rValue = 0n;
for (let i = 0; i < Math.min(input.r.length, 255); i++) {
    if (input.r[i] === 1 || input.r[i] === '1') {
        rValue |= (1n << BigInt(i));
    }
}

const L = 7237005577332262213973186563042994240857116359379907606001950938285454250989n;

console.log("\nr value (decimal):", rValue.toString());
console.log("L value (decimal):", L.toString());
console.log("r < L:", rValue < L);
console.log("r[253] === 0:", input.r[253] === 0);
console.log("r[254] === 0:", input.r[254] === 0);

// Check if r is valid
const isValid = rValue < L && input.r[253] === 0 && input.r[254] === 0;
console.log("\n✅ r is valid:", isValid);

if (!isValid) {
    console.log("\n❌ PROBLEM FOUND:");
    if (rValue >= L) console.log("  - r >= L (r is too large)");
    if (input.r[253] !== 0) console.log("  - r[253] is not zero:", input.r[253]);
    if (input.r[254] !== 0) console.log("  - r[254] is not zero:", input.r[254]);
}
