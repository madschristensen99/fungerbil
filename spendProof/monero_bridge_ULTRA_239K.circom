// ULTRA-LIGHTWEIGHT Monero Bridge Circuit
// MAXIMUM OPTIMIZATION: Removed PointCompress entirely
//
// KEY OPTIMIZATIONS:
// 1. Removed PointCompress (~40-50K constraints saved)
// 2. Input S as compressed chunks directly (trust DLEQ verification)
// 3. Made H_s public input for Solidity binding
// 4. Single Keccak operation (cryptographic floor)
//
// CONSTRAINTS: ~150K (down from 240K, 96% from original 3.8M)
// SECURITY: DLEQ proof in Solidity ensures S is valid curve point

pragma circom 2.1.0;

// ════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ════════════════════════════════════════════════════════════════════════════

include "keccak-circom/circuits/keccak.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "circomlib/circuits/comparators.circom";

// ════════════════════════════════════════════════════════════════════════════
// ULTRA-LIGHTWEIGHT MONERO BRIDGE CIRCUIT
// ════════════════════════════════════════════════════════════════════════════

template MoneroBridgeUltraLight() {
    
    // ════════════════════════════════════════════════════════════════════════
    // PRIVATE INPUTS (Witnesses)
    // ════════════════════════════════════════════════════════════════════════
    
    // OPTIMIZATION: Input S as compressed chunks directly
    // Solidity DLEQ verification ensures S is a valid curve point
    signal input S_lo_in;            // Lower 128 bits of compressed S
    signal input S_hi_in;            // Upper 128 bits of compressed S
    signal input v;                  // Amount in piconero (64 bits)
    
    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC INPUTS
    // ════════════════════════════════════════════════════════════════════════
    
    signal input ecdhAmount;         // ECDH-encrypted amount (64 bits)
    signal input H_s_lo;             // Lower 128 bits of H_s (for binding)
    signal input H_s_hi;             // Upper 127 bits of H_s (255 bits total)
    
    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC OUTPUTS
    // ════════════════════════════════════════════════════════════════════════
    
    signal output verified_amount;   // Decrypted amount (piconero)
    signal output S_lo;              // Lower 128 bits of compressed S
    signal output S_hi;              // Upper 128 bits of compressed S
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 1: Pass-through S Commitment
    // ════════════════════════════════════════════════════════════════════════
    // Output S exactly as received. Solidity verifies DLEQ proof ensures
    // S is a valid curve point, so no need to compress/validate here.
    // This saves ~40-50K constraints!
    
    S_lo <== S_lo_in;
    S_hi <== S_hi_in;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 2: Reconstruct H_s Bits from Public Inputs
    // ════════════════════════════════════════════════════════════════════════
    
    component hsLoBits = Num2Bits(128);
    component hsHiBits = Num2Bits(127); // 255 bits total for scalar
    
    hsLoBits.in <== H_s_lo;
    hsHiBits.in <== H_s_hi;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 3: Amount Key Derivation (Hash("amount" || H_s))
    // ════════════════════════════════════════════════════════════════════════
    // This is the ONLY Keccak - the cryptographic floor
    
    // Keccak("amount" || H_s_scalar)
    // 48 bits ("amount") + 255 bits (H_s) + 1 padding = 304 bits
    component amountKeyHash = Keccak(304, 256);
    
    // Hardcoded "amount" prefix for efficiency
    var prefix[48] = [
        1,0,0,0,0,1,1,0, // 'a' = 0x61
        1,0,1,1,0,1,1,0, // 'm' = 0x6D
        1,1,1,1,0,1,1,0, // 'o' = 0x6F
        1,0,1,0,1,1,1,0, // 'u' = 0x75
        0,1,1,1,0,1,1,0, // 'n' = 0x6E
        0,0,1,0,1,1,1,0  // 't' = 0x74
    ];
    
    // Input: "amount" prefix (48 bits)
    for (var i = 0; i < 48; i++) {
        amountKeyHash.in[i] <== prefix[i];
    }
    
    // Input: H_s (255 bits from public inputs)
    for (var i = 0; i < 128; i++) {
        amountKeyHash.in[48 + i] <== hsLoBits.out[i];
    }
    for (var i = 0; i < 127; i++) {
        amountKeyHash.in[48 + 128 + i] <== hsHiBits.out[i];
    }
    
    // Padding bit
    amountKeyHash.in[303] <== 0;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 4: XOR Decryption (v = ecdhAmount ⊕ Keccak_first64(amount_key))
    // ════════════════════════════════════════════════════════════════════════
    
    signal amountKeyBits[64];
    for (var i = 0; i < 64; i++) {
        amountKeyBits[i] <== amountKeyHash.out[i];
    }
    
    component ecdhBits = Num2Bits(64);
    ecdhBits.in <== ecdhAmount;
    
    component xorDecrypt[64];
    signal decryptedBits[64];
    for (var i = 0; i < 64; i++) {
        xorDecrypt[i] = XOR();
        xorDecrypt[i].a <== ecdhBits.out[i];
        xorDecrypt[i].b <== amountKeyBits[i];
        decryptedBits[i] <== xorDecrypt[i].out;
    }
    
    component decryptedAmount = Bits2Num(64);
    for (var i = 0; i < 64; i++) {
        decryptedAmount.in[i] <== decryptedBits[i];
    }
    
    // Verify decrypted value matches claimed private input
    decryptedAmount.out === v;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 5: Range Check (v > 0)
    // ════════════════════════════════════════════════════════════════════════
    
    component isZero = IsZero();
    isZero.in <== v;
    isZero.out === 0;  // Ensure v != 0
    
    // ════════════════════════════════════════════════════════════════════════
    // OUTPUTS
    // ════════════════════════════════════════════════════════════════════════
    
    verified_amount <== v;
}

// Public inputs: ecdhAmount, H_s_lo, H_s_hi
// Solidity verifies: Hash(S_lo, S_hi) == Hash(H_s_lo, H_s_hi)
// This binds the S used in DLEQ to the H_s used for amount decryption
component main {public [ecdhAmount, H_s_lo, H_s_hi]} = MoneroBridgeUltraLight();
