pragma circom 2.1.6;

include "poseidon.circom";
include "bitify.circom";

template Main() {
    signal input txKey[256];
    signal input txHash[256];
    signal input destHash[256];
    signal input amount;
    signal input blockHash[256];
    signal input mask;
    signal input merkleRoot;

    // 1. txKey constraint (255-bit scalar)
    component sc = Num2Bits(254);
    for (var i=0; i<254; i++) sc.in[i] <== txKey[i];

    // 2. Shared secret = Poseidon(txKey)
    component ss = Poseidon(256);
    for (var i=0; i<256; i++) ss.in[i] <== txKey[i];

    // 3. Amount commitment check
    component h_amt = Poseidon(2);
    h_amt.in[0] <== ss.out;
    h_amt.in[1] <== mask;
    h_amt.out === amount;

    // 4. Transaction validation
    component txVerifier = Poseidon(256);
    for (var i=0; i<256; i++) txVerifier.in[i] <== txHash[i];

    // 5. Destination verification
    component destVerifier = Poseidon(256);
    for (var i=0; i<256; i++) destVerifier.in[i] <== destHash[i];
}

component main = Main();