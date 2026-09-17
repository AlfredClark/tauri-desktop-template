use rust_i18n::t;

/// 问候文案：`name` 为 `"123"` 时返回业务错误，用于演示前端 `.failed()` 分支与自动失败上报。
///
/// 后端文案与前端 `Paraglide` 是两套独立文案（演示用，可删除），英文错误文本不直接展示给用户，
/// 前端收到 `{ kind, message }` 后按通用失败提示处理。
pub fn greet(name: &str) -> anyhow::Result<String> {
    if name == "123" {
        anyhow::bail!("Invalid argument");
    }
    Ok(t!("greet", name = name).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_reserved_name() {
        assert!(greet("123").is_err());
    }

    #[test]
    fn renders_greeting_with_name() {
        assert!(greet("alice").is_ok_and(|text| text.contains("alice")));
    }
}
