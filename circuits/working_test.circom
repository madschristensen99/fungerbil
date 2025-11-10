pragma circom 2.1.6;

include "poseidon.circom";

template Main() {
    signal input txKey;
    signal input txHash;
    signal input destHash;
    signal input amount;
    signal input mask;

    // Shared secret calculation
    component ss = Poseidon(1);
    ss.inputs[0] <== txKey;

    // Amount commitment
    component h_amt = Poseidon(2);
    h_amt.inputs[0] <== ss.out;
    h_amt.inputs[1] <== mask;
    h_amt.out === amount;
}

component main = Main();