#!/bin/bash
# Test PLONK proof generation with the lightweight circuit

set -e

echo "🔧 Testing PLONK Proof Generation"
echo "Circuit: monero_bridge.circom (lightweight)"
echo "Constraints: 479,880"
echo ""

# Check if Powers of Tau file exists
# PLONK needs 2^20 (1M constraints) because it pads to next power of 2
if [ ! -f "powersOfTau28_hez_final_20.ptau" ]; then
    echo "📥 Downloading Powers of Tau (2^20 = 1M constraints for PLONK)..."
    echo "This may take a few minutes (~600MB file)..."
    wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_20.ptau
fi

echo ""
echo "⏱️  Step 1: PLONK Setup (generating proving key)..."
START=$(date +%s)
snarkjs plonk setup monero_bridge.r1cs powersOfTau28_hez_final_20.ptau monero_bridge_plonk.zkey
END=$(date +%s)
SETUP_TIME=$((END - START))
echo "✅ Setup complete: ${SETUP_TIME}s"

echo ""
echo "⏱️  Step 2: Export verification key..."
snarkjs zkey export verificationkey monero_bridge_plonk.zkey verification_key_plonk.json
echo "✅ Verification key exported"

echo ""
echo "⏱️  Step 3: Generate witness..."
START=$(date +%s)
snarkjs wtns calculate monero_bridge_js/monero_bridge.wasm input.json witness.wtns
END=$(date +%s)
WITNESS_TIME=$((END - START))
echo "✅ Witness generated: ${WITNESS_TIME}s"

echo ""
echo "⏱️  Step 4: Generate PLONK proof (THIS IS THE BIG ONE)..."
START=$(date +%s)
snarkjs plonk prove monero_bridge_plonk.zkey witness.wtns proof_plonk.json public_plonk.json
END=$(date +%s)
PROVE_TIME=$((END - START))
echo "✅ Proof generated: ${PROVE_TIME}s"

echo ""
echo "⏱️  Step 5: Verify proof..."
START=$(date +%s)
snarkjs plonk verify verification_key_plonk.json public_plonk.json proof_plonk.json
END=$(date +%s)
VERIFY_TIME=$((END - START))
echo "✅ Proof verified: ${VERIFY_TIME}s"

echo ""
echo "═══════════════════════════════════════"
echo "📊 PLONK Performance Summary"
echo "═══════════════════════════════════════"
echo "Setup:        ${SETUP_TIME}s (one-time, universal)"
echo "Witness:      ${WITNESS_TIME}s"
echo "Prove:        ${PROVE_TIME}s ⭐"
echo "Verify:       ${VERIFY_TIME}s"
echo ""
echo "Total (after setup): $((WITNESS_TIME + PROVE_TIME))s"
echo ""
echo "💾 File sizes:"
ls -lh monero_bridge_plonk.zkey proof_plonk.json public_plonk.json 2>/dev/null | awk '{print $9 ": " $5}'
echo ""
echo "🎉 Full PLONK proof generation successful!"
echo ""
echo "📊 PLONK vs Groth16 Comparison:"
echo "  • Setup: PLONK uses universal setup (no ceremony needed)"
echo "  • Proof size: PLONK ~2-3x larger than Groth16"
echo "  • Verification: PLONK ~20-30% more gas than Groth16"
echo "  • Flexibility: PLONK allows circuit updates without new setup"
