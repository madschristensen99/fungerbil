use risc0_zkvm::guest::env;
use say_hello::{Input, Output, say_hello};

fn main() {
    let input: Input = env::read();
    let output = say_hello(input);
    env::commit(&output);
}