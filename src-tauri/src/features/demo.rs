use rust_i18n::t;

pub fn greet(name: &str) -> String {
    t!("greet", name = name).to_string()
}
