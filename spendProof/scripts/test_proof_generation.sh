#!/bin/bash
# Test full Groth16 proof generation with the lightweight circuit

set -e

echo "🔧 Testing Groth16 Proof Generation"
echo "Circuit: monero_bridge.circom (lightweight)"
echo "Constraints: 479,880"
echo ""

# We need a ptau file for 480K constraints
# 2^19 = 524K constraints (next power of 2 above 480K)
if [ ! -f "powersOfTau28_hez_final_19.ptau" ]; then
    echo "📥 Downloading Powers of Tau (2^19 = 524K constraints)..."
    echo "This may take a few minutes (~300MB file)..."
    wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_19.ptau
fi

echo ""
echo "⏱️  Step 1: Groth16 Setup (generating proving key)..."
START=$(date +%s)
snarkjs groth16 setup monero_bridge.r1cs powersOfTau28_hez_final_19.ptau monero_bridge_0000.zkey
END=$(date +%s)
SETUP_TIME=$((END - START))
echo "✅ Setup complete: ${SETUP_TIME}s"

echo ""
echo "⏱️  Step 2: Contribute randomness..."
START=$(date +%s)
echo "random entropy" | snarkjs zkey contribute monero_bridge_0000.zkey monero_bridge_final.zkey --name="First contribution" -v
END=$(date +%s)
CONTRIBUTE_TIME=$((END - START))
echo "✅ Contribution complete: ${CONTRIBUTE_TIME}s"

echo ""
echo "⏱️  Step 3: Export verification key..."
snarkjs zkey export verificationkey monero_bridge_final.zkey verification_key.json
echo "✅ Verification key exported"

echo ""
echo "⏱️  Step 4: Generate witness..."
START=$(date +%s)
snarkjs wtns calculate monero_bridge_js/monero_bridge.wasm input.json witness.wtns
END=$(date +%s)
WITNESS_TIME=$((END - START))
echo "✅ Witness generated: ${WITNESS_TIME}s"

echo ""
echo "⏱️  Step 5: Generate proof (THIS IS THE BIG ONE)..."
START=$(date +%s)
snarkjs groth16 prove monero_bridge_final.zkey witness.wtns proof.json public.json
END=$(date +%s)
PROVE_TIME=$((END - START))
echo "✅ Proof generated: ${PROVE_TIME}s"

echo ""
echo "⏱️  Step 6: Verify proof..."
START=$(date +%s)
snarkjs groth16 verify verification_key.json public.json proof.json
END=$(date +%s)
VERIFY_TIME=$((END - START))
echo "✅ Proof verified: ${VERIFY_TIME}s"

echo ""
echo "═══════════════════════════════════════"
echo "📊 Performance Summary"
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
ls -lh monero_bridge_final.zkey proof.json public.json | awk '{print $9 ": " $5}'
echo ""
echo "🎉 Full Groth16 proof generation successful!"
