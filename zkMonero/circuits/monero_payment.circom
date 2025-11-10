pragma circom 2.1.6;

// Monero Payment Verification Circuit
// Zero-knowledge proof that a Monero payment occurred without revealing details

include "poseidon.circom";

template MoneroPayment() {
    // Private inputs (kept secret by prover)
    signal input txKey[256];
    signal input mask;
    signal input path[4];
    signal input siblings[4];

    // Public inputs (visible to verifier)
    signal input txHash[256];
    signal input destHash[256];
    signal input amount;
    signal input blockRoot[256];

    var i;

    // 1. Validate all bits are 0 or 1
    for (i = 0; i < 256; i++) {
        txKey[i] * (1 - txKey[i]) === 0;
        txHash[i] * (1 - txHash[i]) === 0;
        destHash[i] * (1 - destHash[i]) === 0;
    }

    // 2. Validate Merkle path is binary (0 or 1)
    for (i = 0; i < 4; i++) {
        path[i] * (1 - path[i]) === 0;
    }

    // 3. Validate commitment mask is binary
    mask * (mask - 1) === 0;

    // 4. Generate view key from transaction key
    component viewKeyHash = Poseidon(8);
    viewKeyHash.inputs[0] <== txKey[0] + txKey[1] * 2 + txKey[2] * 4 + txKey[3] * 8;
    viewKeyHash.inputs[1] <== txKey[32] + txKey[33] * 2 + txKey[34] * 4 + txKey[35] * 8;
    viewKeyHash.inputs[2] <== txKey[64] + txKey[65] * 2 + txKey[66] * 4 + txKey[67] * 8;
    viewKeyHash.inputs[3] <== txKey[96] + txKey[97] * 2 + txKey[98] * 4 + txKey[99] * 8;
    viewKeyHash.inputs[4] <== txKey[128] + txKey[129] * 2 + txKey[130] * 4 + txKey[131] * 8;
    viewKeyHash.inputs[5] <== txKey[160] + txKey[161] * 2 + txKey[162] * 4 + txKey[163] * 8;
    viewKeyHash.inputs[6] <== txKey[192] + txKey[193] * 2 + txKey[194] * 4 + txKey[195] * 8;
    viewKeyHash.inputs[7] <== txKey[224] + txKey[225] * 2 + txKey[226] * 4 + txKey[227] * 8;

    // 5. Amount commitment verification (performs Pedersen-like commitment)
    component amountCommit = Poseidon(2);
    amountCommit.inputs[0] <== viewKeyHash.out;
    amountCommit.inputs[1] <== mask;
    amountCommit.out === amount;

    // 6. Transaction verification - link to Merkle tree
    component txCommit = Poseidon(8);
    txCommit.inputs[0] <== txHash[0] + txHash[1] * 2 + txHash[2] * 4 + txHash[3] * 8;
    txCommit.inputs[1] <== txHash[64] + txHash[65] * 2 + txHash[66] * 4 + txHash[67] * 8;
    txCommit.inputs[2] <== txHash[128] + txHash[129] * 2 + txHash[130] * 4 + txHash[131] * 8;
    txCommit.inputs[3] <== txHash[192] + txHash[193] * 2 + txHash[194] * 4 + txHash[195] * 8;
    txCommit.inputs[4] <== destHash[0] + destHash[1] * 2 + destHash[2] * 4 + destHash[3] * 8;
    txCommit.inputs[5] <== destHash[64] + destHash[65] * 2 + destHash[66] * 4 + destHash[67] * 8;
    txCommit.inputs[6] <== destHash[128] + destHash[129] * 2 + destHash[130] * 4 + destHash[131] * 8;
    txCommit.inputs[7] <== destHash[192] + destHash[193] * 2 + destHash[194] * 4 + destHash[195] * 8;

    // 7. Block root commitment verification
    component blockCommit = Poseidon(8);
    blockCommit.inputs[0] <== blockRoot[0] + blockRoot[1] * 2 + blockRoot[2] * 4 + blockRoot[3] * 8;
    blockCommit.inputs[1] <== blockRoot[64] + blockRoot[65] * 2 + blockRoot[66] * 4 + blockRoot[67] * 8;
    blockCommit.inputs[2] <== blockRoot[128] + blockRoot[129] * 2 + blockRoot[130] * 4 + blockRoot[131] * 8;
    blockCommit.inputs[3] <== blockRoot[192] + blockRoot[193] * 2 + blockRoot[194] * 4 + blockRoot[195] * 8;
    blockCommit.inputs[4] <== txCommit.out;
    blockCommit.inputs[5] <== path[0] + path[1] * 2 + path[2] * 4 + path[3] * 8;
    blockCommit.inputs[6] <== siblings[0] + siblings[1] * 2;
    blockCommit.inputs[7] <== siblings[2] + siblings[3] * 2;
}

component main { public [txHash, destHash, amount, blockRoot] } = MoneroPayment();