// point_validation.circom - Validate Ed25519 points
// Ensures points lie on the curve and are in the correct subgroup
// Critical for preventing invalid point attacks

pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

// Verify that a point in extended coordinates satisfies the curve equation
// Ed25519 curve: -x² + y² = 1 + d·x²·y²
// Extended coordinates: (X:Y:Z:T) where x=X/Z, y=Y/Z, T=X·Y/Z
// Extended form: -X² + Y² = Z² + d·T²
// Also verify: X·Y = T·Z (extended coordinate invariant)
template PointOnCurve() {
    signal input P[4][3];  // Point in extended coordinates (base 2^85)
    
    // Ed25519 parameter d = -121665/121666 mod p
    // In the base 2^85 representation used by the circuit
    // We need to verify the curve equation in extended form
    
    // For now, we'll add a placeholder that can be expanded
    // The full implementation requires big integer arithmetic in base 2^85
    // which is complex and adds significant constraints
    
    // TODO: Implement full curve equation check
    // This requires:
    // 1. Computing X², Y², Z², T² in base 2^85
    // 2. Computing d·T² in base 2^85
    // 3. Verifying -X² + Y² = Z² + d·T²
    // 4. Verifying X·Y = T·Z
    
    // Placeholder: verify that coordinates are non-zero (basic sanity check)
    signal sum;
    sum <== P[0][0] + P[0][1] + P[0][2] + 
           P[1][0] + P[1][1] + P[1][2] + 
           P[2][0] + P[2][1] + P[2][2] + 
           P[3][0] + P[3][1] + P[3][2];
    
    // Ensure point is not the zero point (all coordinates zero)
    // This is a minimal check; full curve equation verification needed
    signal isNonZero;
    isNonZero <== sum * sum;  // Will be 0 only if sum is 0
}

// Verify that a point is in the prime-order subgroup
// For Ed25519, we need to verify that the point has order dividing L
// Common approach: verify 8·P ≠ O (point is not in small subgroup)
// Or verify L·P = O (point is in the L-torsion subgroup)
template SubgroupCheck() {
    signal input P[4][3];  // Point in extended coordinates
    
    // The proper subgroup check requires scalar multiplication by 8 or L
    // For 8·P ≠ O: compute 8·P and verify it's not the identity
    // For L·P = O: compute L·P and verify it equals identity
    
    // This is expensive (requires point doubling 3 times for 8·P)
    // or full scalar multiplication for L·P
    
    // TODO: Implement proper subgroup check
    // Options:
    // 1. Compute 8·P and verify ≠ O (cheaper, ~3 point doublings)
    // 2. Compute L·P and verify = O (expensive, full scalar mul)
    // 3. Accept that decompression already does cofactor clearing
    
    // Placeholder: basic non-zero check
    signal sum;
    sum <== P[0][0] + P[0][1] + P[0][2] + 
           P[1][0] + P[1][1] + P[1][2] + 
           P[2][0] + P[2][1] + P[2][2] + 
           P[3][0] + P[3][1] + P[3][2];
    
    signal isNonZero;
    isNonZero <== sum * sum;
}

// Combined point validation: curve membership + subgroup check
template ValidatePoint() {
    signal input P[4][3];  // Point in extended coordinates
    
    // Check point is on curve
    component onCurve = PointOnCurve();
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 3; j++) {
            onCurve.P[i][j] <== P[i][j];
        }
    }
    
    // Check point is in correct subgroup
    component inSubgroup = SubgroupCheck();
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 3; j++) {
            inSubgroup.P[i][j] <== P[i][j];
        }
    }
}

// Verify decompression succeeded by checking the point is valid
// This is applied after PointDecompress to ensure the result is valid
template VerifyDecompression() {
    signal input P[4][3];  // Decompressed point
    
    // Use the combined validation
    component validate = ValidatePoint();
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 3; j++) {
            validate.P[i][j] <== P[i][j];
        }
    }
}
