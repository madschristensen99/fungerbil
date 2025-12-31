const ed = require('@noble/ed25519');
const fs = require('fs');

async function debugPDerivation() {
    // Read the witness data
    const input = JSON.parse(fs.readFileSync('input.json', 'utf8'));
    
    console.log('🔍 Debugging P Derivation\n');
    
    // Extract H_s_scalar from input (255 bits, LSB first)
    const H_s_scalar_bits = input.H_s_scalar;
    let H_s_scalar = 0n;
    for (let i = 0; i < 255; i++) {
        if (H_s_scalar_bits[i] === '1') {
            H_s_scalar |= (1n << BigInt(i));
        }
    }
    console.log('H_s scalar:', H_s_scalar.toString(16).padStart(64, '0'));
    
    // Extract B_compressed from input
    const B_compressed = BigInt(input.B_compressed);
    console.log('B_compressed:', B_compressed.toString(16).padStart(64, '0'));
    
    // Decompress B
    const B_compressed_hex = B_compressed.toString(16).padStart(64, '0');
    const B_point = ed.Point.fromHex(B_compressed_hex);
    console.log('B decompressed successfully');
    
    // Compute H_s·G
    const G = ed.Point.BASE;
    const H_s_G = G.multiply(H_s_scalar);
    console.log('H_s·G computed:', H_s_G.toHex().substring(0, 32) + '...');
    
    // Add B: P = H_s·G + B
    const P_derived = H_s_G.add(B_point);
    const P_derived_hex = P_derived.toHex();
    console.log('P_derived:', P_derived_hex);
    
    // Extract P_compressed from input
    const P_compressed = BigInt(input.P_compressed);
    const P_compressed_hex = P_compressed.toString(16).padStart(64, '0');
    console.log('P_expected:', P_compressed_hex);
    
    // Compare
    if (P_derived_hex.toLowerCase() === P_compressed_hex.toLowerCase()) {
        console.log('\n✅ SUCCESS: Derived P matches expected P!');
    } else {
        console.log('\n❌ MISMATCH: Derived P does NOT match expected P');
        console.log('This means either:');
        console.log('1. H_s_scalar is incorrect');
        console.log('2. B is incorrect');
        console.log('3. The expected P is from a different derivation');
    }
}

debugPDerivation().catch(console.error);
