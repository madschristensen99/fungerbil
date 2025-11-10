pragma circom 2.1.6;

include "poseidon.circom";

template MoneroProof() {
    signal input txKey[32];
    signal input mask;
    signal input txHash[32];
    signal input dest[32];
    signal input amount;

    component hasher = Poseidon(4);
    hasher.inputs[0] <== txKey[0];
    hasher.inputs[1] <== mask;
    hasher.inputs[2] <== txHash[0];
    hasher.inputs[3] <== dest[0];
    
    hasher.out === amount;
}

component main { public [txHash, dest, amount] } = MoneroProof();
