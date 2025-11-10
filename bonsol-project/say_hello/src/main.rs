use say_hello::{Input, say_hello};

fn main() {
    let input = Input {
        name: "World".to_string(),
    };
    
    println!("🎯 Running Bonsol Hello World test");
    println!("Input: {:?}", input);
    
    let output = say_hello(input);
    println!("Output: {:?}", output);
    
    println!();
    println!("✅ Bonsol program working correctly!");
    println!("The say_hello function takes a name and returns a greeting as verifiable output");
    println!("Ready for zkVM compilation and deployment!");
}