// keccak256.circom - Keccak256 Hash Function Wrapper
// Wraps the keccak-circom library for Keccak256 (256-bit output)

pragma circom 2.1.0;

include "../../node_modules/keccak-circom/circuits/keccak.circom";

// Keccak256 wrapper - takes nBitsIn input bits, outputs 256 bits
template Keccak256(nBitsIn) {
    signal input in[nBitsIn];
    signal output out[256];
    
    component keccak = Keccak(nBitsIn, 256);
    
    for (var i = 0; i < nBitsIn; i++) {
        keccak.in[i] <== in[i];
    }
    
    for (var i = 0; i < 256; i++) {
        out[i] <== keccak.out[i];
    }
}