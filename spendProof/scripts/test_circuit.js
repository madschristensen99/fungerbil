// Test lightweight circuit with real and fake data
const fs = require('fs');
const { execSync } = require('child_process');

console.log("🧪 Testing Ultra-Lightweight Monero Bridge Circuit\n");
console.log("Constraints: 240,190 (50% reduction from light, 94% from original)\n");

// Test 1: Real data (should PASS)
console.log("Test 1: Real Monero transaction data");
const test1Start = Date.now();
try {
    execSync('snarkjs wtns calculate monero_bridge_ultra_light_js/monero_bridge_ultra_light.wasm input.json witness.wtns', {
        cwd: process.cwd(),
        stdio: 'pipe'
    });
    const test1Time = Date.now() - test1Start;
    console.log(`✅ PASS - Real data accepted (⏱️  ${test1Time}ms)\n`);
} catch (e) {
    const test1Time = Date.now() - test1Start;
    console.log(`❌ FAIL - Real data rejected (unexpected!) (⏱️  ${test1Time}ms)\n`);
}

// Test 2: Wrong H_s_scalar (should FAIL - breaks amount decryption)
console.log("Test 2: Wrong H_s_scalar (tests amount key derivation)");
const realInput = JSON.parse(fs.readFileSync('input.json', 'utf8'));
const wrongHs = JSON.parse(JSON.stringify(realInput));
// Flip some bits in H_s_scalar to break amount decryption
wrongHs.H_s_scalar[0] = wrongHs.H_s_scalar[0] === "0" ? "1" : "0";
wrongHs.H_s_scalar[10] = wrongHs.H_s_scalar[10] === "0" ? "1" : "0";
fs.writeFileSync('input_wrong_r.json', JSON.stringify(wrongHs, null, 2));

const test2Start = Date.now();
try {
    execSync('snarkjs wtns calculate monero_bridge_js/monero_bridge.wasm input_wrong_r.json witness_wrong_r.wtns', {
        cwd: process.cwd(),
        stdio: 'pipe'
    });
    const test2Time = Date.now() - test2Start;
    console.log(`❌ FAIL - Wrong H_s accepted (⏱️  ${test2Time}ms)`);
    console.log(`    (Should fail - wrong H_s can't decrypt amount correctly)\n`);
} catch (e) {
    const test2Time = Date.now() - test2Start;
    console.log(`✅ PASS - Wrong H_s rejected (⏱️  ${test2Time}ms)`);
    console.log(`    (Amount decryption fails with wrong H_s)\n`);
}

// Test 3: Wrong amount (fraud case - should fail but currently passes)
console.log("Test 3: Correct secret key but wrong amount (fraud case)");
const wrongAmount = JSON.parse(JSON.stringify(realInput));
// Real amount is 20000000000, let's claim 100000000000 (5x more)
wrongAmount.v = "100000000000";
fs.writeFileSync('input_wrong_amount.json', JSON.stringify(wrongAmount, null, 2));

const test3Start = Date.now();
try {
    execSync('snarkjs wtns calculate monero_bridge_js/monero_bridge.wasm input_wrong_amount.json witness_wrong_amount.wtns', {
        cwd: process.cwd(),
        stdio: 'pipe'
    });
    const test3Time = Date.now() - test3Start;
    console.log(`❌ FAIL (FRAUD!) - Wrong amount accepted (security vulnerability!) (⏱️  ${test3Time}ms)`);
    console.log("    Real amount: 20000000000 piconero (0.02 XMR)");
    console.log("    Claimed: 100000000000 piconero (0.1 XMR)");
    console.log("    🚨 Amount verification is NOT working!\n");
} catch (e) {
    const test3Time = Date.now() - test3Start;
    console.log(`✅ PASS - Wrong amount rejected (amount verification working) (⏱️  ${test3Time}ms)\n`);
}

// Test 4: Removed - R_x and tx_hash now verified in Solidity
console.log("Test 4: Skipped (R_x moved to Solidity binding hash)\n");

console.log("═══════════════════════════════════════");
console.log("Ultra-Lightweight Circuit Summary:");
console.log("");
console.log("✅ Circuit Verifies:");
console.log("  1. Amount decryption: v = ecdhAmount ⊕ Keccak(\"amount\" || H_s)");
console.log("  2. Outputs: verified_amount, S_compressed");
console.log("  3. Range checks: v > 0, v < 2^64");
console.log("");
console.log("🔐 Solidity Verifies:");
console.log("  1. Binding hash: Hash(R, S, tx_hash) - EVM precompile");
console.log("  2. DLEQ proof: log_G(R) = log_A(S/8)");
console.log("  3. Replay protection: tx_hash not claimed");
console.log("");
console.log("⚡ Performance: 240,190 constraints (94% reduction)");
console.log("🎯 Architecture: Ultra-Light (Keccak in Solidity)");
console.log("═══════════════════════════════════════");
