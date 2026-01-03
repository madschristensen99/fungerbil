#!/bin/bash
# Test Groth16 proof generation with ultra-lightweight circuit

set -e

echo "🔧 Testing Groth16 Proof Generation (Ultra-Light)"
echo "Circuit: monero_bridge_ultra_light.circom"
echo "Constraints: 240,190"
echo ""

# Check if Powers of Tau file exists
if [ ! -f "powersOfTau28_hez_final_19.ptau" ]; then
    echo "📥 Downloading Powers of Tau (2^19 = 524K constraints)..."
    wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_19.ptau
fi

echo ""
echo "⏱️  Step 1: Groth16 Setup (generating proving key)..."
START=$(date +%s)
snarkjs groth16 setup monero_bridge_ultra_light.r1cs powersOfTau28_hez_final_19.ptau monero_bridge_ultra_0000.zkey
END=$(date +%s)
SETUP_TIME=$((END - START))
echo "✅ Setup complete: ${SETUP_TIME}s"

echo ""
echo "⏱️  Step 2: Contribute randomness..."
START=$(date +%s)
echo "random entropy" | snarkjs zkey contribute monero_bridge_ultra_0000.zkey monero_bridge_ultra_final.zkey --name="First contribution" -v
END=$(date +%s)
CONTRIBUTE_TIME=$((END - START))
echo "✅ Contribution complete: ${CONTRIBUTE_TIME}s"

echo ""
echo "⏱️  Step 3: Export verification key..."
snarkjs zkey export verificationkey monero_bridge_ultra_final.zkey verification_key_ultra.json
echo "✅ Verification key exported"

echo ""
echo "⏱️  Step 4: Generate witness..."
START=$(date +%s)
snarkjs wtns calculate monero_bridge_ultra_light_js/monero_bridge_ultra_light.wasm input.json witness.wtns
END=$(date +%s)
WITNESS_TIME=$((END - START))
echo "✅ Witness generated: ${WITNESS_TIME}s"

echo ""
echo "⏱️  Step 5: Generate proof (THIS IS THE BIG ONE)..."
START=$(date +%s)
snarkjs groth16 prove monero_bridge_ultra_final.zkey witness.wtns proof_ultra.json public_ultra.json
END=$(date +%s)
PROVE_TIME=$((END - START))
echo "✅ Proof generated: ${PROVE_TIME}s"

echo ""
echo "⏱️  Step 6: Verify proof..."
START=$(date +%s)
snarkjs groth16 verify verification_key_ultra.json public_ultra.json proof_ultra.json
END=$(date +%s)
VERIFY_TIME=$((END - START))
echo "✅ Proof verified: ${VERIFY_TIME}s"

echo ""
echo "═══════════════════════════════════════"
echo "📊 Groth16 Performance Summary (Ultra-Light)"
echo "═══════════════════════════════════════"
echo "Setup:        ${SETUP_TIME}s (one-time)"
echo "Contribution: ${CONTRIBUTE_TIME}s (one-time)"
echo "Witness:      ${WITNESS_TIME}s"
echo "Prove:        ${PROVE_TIME}s ⭐"
echo "Verify:       ${VERIFY_TIME}s"
echo ""
echo "Total (after setup): $((WITNESS_TIME + PROVE_TIME))s"
echo ""
echo "💾 File sizes:"
ls -lh monero_bridge_ultra_final.zkey proof_ultra.json public_ultra.json | awk '{print $9 ": " $5}'
echo ""
echo "🎉 Full Groth16 proof generation successful!"
echo ""
echo "📊 Comparison:"
echo "  Light (480K):      7s proof time"
echo "  Ultra-Light (240K): ${PROVE_TIME}s proof time"
echo "  Improvement:       ~$((700 - PROVE_TIME * 100 / 7))% faster"
