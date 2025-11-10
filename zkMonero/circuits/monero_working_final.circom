pragma circom 2.1.6;

include "poseidon.circom";

template CompactMoneroProof() {
    signal input txKey[8];
    signal input mask;
    signal input txHash[8];
    signal input dest[8];
    signal input amount;
    
    component hasher = Poseidon(5);
    hasher.inputs[0] <== txKey[0];
    hasher.inputs[1] <== txKey[1];
    hasher.inputs[2] <== mask;
    hasher.inputs[3] <== txHash[0];
    hasher.inputs[4] <== dest[0];
    
    hasher.out === amount;
}

component main { public [txHash, dest, amount] } = CompactMoneroProof();
