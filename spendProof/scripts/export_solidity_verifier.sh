#!/bin/bash
# Export Groth16 verifier to Solidity

set -e

echo "🔧 Exporting Solidity Verifier"
echo ""

# Check if zkey exists
if [ ! -f "monero_bridge_light_final.zkey" ]; then
    echo "❌ Error: monero_bridge_light_final.zkey not found"
    echo "Run ./scripts/test_proof_generation.sh first to generate the proving key"
    exit 1
fi

# Export verifier
echo "⏱️  Exporting Groth16 verifier contract..."
snarkjs zkey export solidityverifier monero_bridge_light_final.zkey contracts/MoneroBridgeVerifier.sol

echo "✅ Verifier exported to contracts/MoneroBridgeVerifier.sol"
echo ""

# Show contract info
echo "📊 Contract Info:"
echo "  • Contract name: Groth16Verifier"
echo "  • Function: verifyProof()"
echo "  • Gas estimate: ~250-300k gas"
echo ""

# Create a sample test file
mkdir -p contracts
cat > contracts/MoneroBridgeVerifier.test.js << 'EOF'
// Test Solidity verifier with real proof
const fs = require('fs');

async function testVerifier() {
    console.log("🧪 Testing Solidity Verifier\n");
    
    // Load proof and public signals
    const proof = JSON.parse(fs.readFileSync('proof_light.json', 'utf8'));
    const publicSignals = JSON.parse(fs.readFileSync('public_light.json', 'utf8'));
    
    console.log("📋 Proof data:");
    console.log("  • Public signals:", publicSignals.length);
    console.log("  • R_x:", publicSignals[0]);
    console.log("  • ecdhAmount:", publicSignals[1]);
    console.log("  • monero_tx_hash:", publicSignals[2]);
    console.log("  • binding_hash (output):", publicSignals[3]);
    console.log("  • verified_amount (output):", publicSignals[4]);
    console.log("");
    
    // Format for Solidity
    const a = [proof.pi_a[0], proof.pi_a[1]];
    const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const c = [proof.pi_c[0], proof.pi_c[1]];
    
    console.log("✅ Proof formatted for Solidity");
    console.log("  • a:", a);
    console.log("  • b:", b);
    console.log("  • c:", c);
    console.log("");
    
    console.log("💡 Next steps:");
    console.log("  1. Deploy MoneroBridgeVerifier.sol to testnet");
    console.log("  2. Call verifyProof(a, b, c, publicSignals)");
    console.log("  3. Should return true for valid proof");
    console.log("");
    
    // Save formatted proof
    const formattedProof = {
        a,
        b,
        c,
        publicSignals
    };
    
    fs.writeFileSync('contracts/proof_formatted.json', JSON.stringify(formattedProof, null, 2));
    console.log("✅ Formatted proof saved to contracts/proof_formatted.json");
}

testVerifier().catch(console.error);
EOF

echo "✅ Created test file: contracts/MoneroBridgeVerifier.test.js"
echo ""
echo "🎯 Next steps:"
echo "  1. Run: node contracts/MoneroBridgeVerifier.test.js"
echo "  2. Deploy contracts/MoneroBridgeVerifier.sol to testnet"
echo "  3. Call verifyProof() with formatted proof"
