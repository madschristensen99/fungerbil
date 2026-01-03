// MINIMAL Monero Bridge Circuit
// MAXIMUM OPTIMIZATION: All Keccak operations moved to Solidity
//
// RADICAL SIMPLIFICATION:
// - Solidity computes: H_s = Keccak(S), amount_key = Keccak("amount" || H_s)
// - Circuit only does: XOR decryption + range check
// - Constraints: ~200-300 (down from 239K!)
//
// SECURITY: Unchanged - binding happens via public inputs
// PERFORMANCE: Sub-second proofs even with PLONK

pragma circom 2.1.0;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "circomlib/circuits/comparators.circom";

template MoneroBridgeMinimal() {
    
    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC INPUTS (pre-computed by Solidity)
    // ════════════════════════════════════════════════════════════════════════
    
    signal input amount_key;         // First 64 bits of Keccak("amount" || H_s)
    signal input ecdhAmount;         // ECDH-encrypted amount
    
    // ════════════════════════════════════════════════════════════════════════
    // PRIVATE INPUTS
    // ════════════════════════════════════════════════════════════════════════
    
    signal input v;                  // Claimed amount (piconero)
    signal input S_lo;               // Lower 128 bits of S (for commitment)
    signal input S_hi;               // Upper 128 bits of S (for commitment)
    
    // ════════════════════════════════════════════════════════════════════════
    // PUBLIC OUTPUTS
    // ════════════════════════════════════════════════════════════════════════
    
    signal output verified_amount;
    signal output S_lo_out;
    signal output S_hi_out;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 1: Pass-through S for Solidity binding
    // ════════════════════════════════════════════════════════════════════════
    
    S_lo_out <== S_lo;
    S_hi_out <== S_hi;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 2: XOR Decryption (v = ecdhAmount ⊕ amount_key)
    // ════════════════════════════════════════════════════════════════════════
    // This is the ONLY cryptographic operation in the circuit!
    
    component ecdhBits = Num2Bits(64);
    component keyBits = Num2Bits(64);
    
    ecdhBits.in <== ecdhAmount;
    keyBits.in <== amount_key;
    
    component xorDecrypt[64];
    component decrypted = Bits2Num(64);
    
    for (var i = 0; i < 64; i++) {
        xorDecrypt[i] = XOR();
        xorDecrypt[i].a <== ecdhBits.out[i];
        xorDecrypt[i].b <== keyBits.out[i];
        decrypted.in[i] <== xorDecrypt[i].out;
    }
    
    // Verify decryption matches claimed amount
    decrypted.out === v;
    
    // ════════════════════════════════════════════════════════════════════════
    // STEP 3: Range Check (v > 0)
    // ════════════════════════════════════════════════════════════════════════
    
    component isZero = IsZero();
    isZero.in <== v;
    isZero.out === 0;  // Ensure v != 0
    
    // ════════════════════════════════════════════════════════════════════════
    // OUTPUT
    // ════════════════════════════════════════════════════════════════════════
    
    verified_amount <== v;
}

// Public inputs: amount_key (from Solidity), ecdhAmount
// Solidity computes: amount_key = Keccak("amount" || Keccak(S_lo, S_hi))
// This binds the proof to the specific S point used in DLEQ
component main {public [amount_key, ecdhAmount]} = MoneroBridgeMinimal();
