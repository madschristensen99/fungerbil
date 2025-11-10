use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Input {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Output {
    pub greeting: String,
}

pub fn say_hello(input: Input) -> Output {
    let greeting = format!("Hello, {}!", input.name);
    Output { greeting }
}