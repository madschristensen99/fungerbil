// DLEQ (Discrete Log Equality) Proof Implementation
// Proves: log_G(R) = log_A(S/8) using Chaum-Pedersen Sigma Protocol
//
// This proves that the same secret r was used to compute:
// - R = r·G (transaction public key)
// - S = 8·r·A (shared secret with LP)
//
// Without revealing r itself.

const crypto = require('crypto');
const { Point, Scalar } = require('@noble/ed25519');

// Ed25519 curve order (L)
const L = BigInt('0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed');

/**
 * Generate DLEQ proof that log_G(R) = log_A(S/8)
 * 
 * @param {Uint8Array} r_scalar - Secret scalar (32 bytes)
 * @param {Uint8Array} R_compressed - R = r·G (32 bytes compressed)
 * @param {Uint8Array} A_compressed - LP view key A (32 bytes compressed)
 * @param {Uint8Array} S_compressed - S = 8·r·A (32 bytes compressed)
 * @returns {Object} DLEQ proof {c, z, R, S_div8, A, G}
 */
async function generateDLEQProof(r_scalar, R_compressed, A_compressed, S_compressed) {
    console.log('\n🔐 Generating DLEQ Proof...');
    
    // Convert inputs to Points
    const R = await Point.fromHex(R_compressed);
    const A = await Point.fromHex(A_compressed);
    const S = await Point.fromHex(S_compressed);
    const G = Point.BASE;
    
    // Compute S/8 (divide by cofactor)
    // In Ed25519, dividing by 8 means multiplying by the inverse of 8 mod L
    const eight_inv = modInverse(8n, L);
    const S_div8 = S.multiply(eight_inv);
    
    // Convert r to scalar
    const r = Scalar.fromBytes(r_scalar);
    
    // Step 1: Generate random nonce k
    const k_bytes = crypto.randomBytes(32);
    const k = Scalar.fromBytes(k_bytes);
    
    // Step 2: Compute commitments
    // T1 = k·G
    // T2 = k·A
    const T1 = G.multiply(k);
    const T2 = A.multiply(k);
    
    // Step 3: Compute challenge c = Hash(G, A, R, S/8, T1, T2)
    const challenge_input = Buffer.concat([
        Buffer.from(G.toRawBytes()),
        Buffer.from(A.toRawBytes()),
        Buffer.from(R.toRawBytes()),
        Buffer.from(S_div8.toRawBytes()),
        Buffer.from(T1.toRawBytes()),
        Buffer.from(T2.toRawBytes())
    ]);
    
    const c_hash = crypto.createHash('sha256').update(challenge_input).digest();
    const c = Scalar.fromBytes(c_hash) % L;
    
    // Step 4: Compute response z = k + c·r (mod L)
    const z = (k + (c * r)) % L;
    
    const proof = {
        c: c.toString(16).padStart(64, '0'),
        z: z.toString(16).padStart(64, '0'),
        R: Buffer.from(R.toRawBytes()).toString('hex'),
        S_div8: Buffer.from(S_div8.toRawBytes()).toString('hex'),
        A: Buffer.from(A.toRawBytes()).toString('hex'),
        G: Buffer.from(G.toRawBytes()).toString('hex')
    };
    
    console.log('✅ DLEQ Proof generated');
    console.log(`   Challenge (c): ${proof.c.substring(0, 16)}...`);
    console.log(`   Response (z): ${proof.z.substring(0, 16)}...`);
    
    return proof;
}

/**
 * Verify DLEQ proof
 * 
 * @param {Object} proof - DLEQ proof object
 * @returns {boolean} true if proof is valid
 */
async function verifyDLEQProof(proof) {
    console.log('\n🔍 Verifying DLEQ Proof...');
    
    // Parse proof
    const c = BigInt('0x' + proof.c);
    const z = BigInt('0x' + proof.z);
    const R = await Point.fromHex(proof.R);
    const S_div8 = await Point.fromHex(proof.S_div8);
    const A = await Point.fromHex(proof.A);
    const G = await Point.fromHex(proof.G);
    
    // Recompute commitments
    // T1' = z·G - c·R
    // T2' = z·A - c·(S/8)
    const T1_prime = G.multiply(z).subtract(R.multiply(c));
    const T2_prime = A.multiply(z).subtract(S_div8.multiply(c));
    
    // Recompute challenge
    const challenge_input = Buffer.concat([
        Buffer.from(G.toRawBytes()),
        Buffer.from(A.toRawBytes()),
        Buffer.from(R.toRawBytes()),
        Buffer.from(S_div8.toRawBytes()),
        Buffer.from(T1_prime.toRawBytes()),
        Buffer.from(T2_prime.toRawBytes())
    ]);
    
    const c_hash = crypto.createHash('sha256').update(challenge_input).digest();
    const c_prime = Scalar.fromBytes(c_hash) % L;
    
    // Verify c' == c
    const valid = c_prime === c;
    
    if (valid) {
        console.log('✅ DLEQ Proof VALID');
    } else {
        console.log('❌ DLEQ Proof INVALID');
    }
    
    return valid;
}

/**
 * Compute modular inverse using Extended Euclidean Algorithm
 */
function modInverse(a, m) {
    a = ((a % m) + m) % m;
    
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];
    
    while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }
    
    if (old_r > 1n) {
        throw new Error('a is not invertible mod m');
    }
    
    return ((old_s % m) + m) % m;
}

/**
 * Test DLEQ proof with real Monero transaction data
 */
async function testDLEQProof() {
    console.log('🧪 Testing DLEQ Proof Implementation\n');
    
    // Load witness data
    const fs = require('fs');
    const input = JSON.parse(fs.readFileSync('input.json', 'utf8'));
    
    // Extract data (need to convert from circuit format)
    // For now, use dummy data to test the protocol
    
    const r_scalar = crypto.randomBytes(32);
    
    // Generate R = r·G
    const r = Scalar.fromBytes(r_scalar);
    const R = Point.BASE.multiply(r);
    
    // Generate random A (LP view key)
    const A = Point.BASE.multiply(Scalar.fromBytes(crypto.randomBytes(32)));
    
    // Compute S = 8·r·A
    const S = A.multiply(r * 8n);
    
    // Generate proof
    const proof = await generateDLEQProof(
        r_scalar,
        Buffer.from(R.toRawBytes()),
        Buffer.from(A.toRawBytes()),
        Buffer.from(S.toRawBytes())
    );
    
    // Verify proof
    const valid = await verifyDLEQProof(proof);
    
    console.log('\n═══════════════════════════════════════');
    console.log('DLEQ Proof Test Result:', valid ? '✅ PASS' : '❌ FAIL');
    console.log('═══════════════════════════════════════');
    
    return valid;
}

module.exports = {
    generateDLEQProof,
    verifyDLEQProof,
    testDLEQProof
};

// Run test if called directly
if (require.main === module) {
    testDLEQProof().catch(console.error);
}
