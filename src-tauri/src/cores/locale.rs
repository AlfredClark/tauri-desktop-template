//! 语言标签类型：约束 locale 取值，避免非法值写入 config.json 或传给 rust-i18n 运行时。

use std::fmt;

/// 语言标签：仅允许 rust-i18n 已注册的 locale（en / zh-CN）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Locale(String);

impl Locale {
    /// 校验并构造；值不在可用 locale 列表时返回 None。
    /// @param value 语言标签（如 "en"、"zh-CN"）
    /// @returns 校验通过的 Locale
    pub fn new(value: &str) -> Option<Self> {
        rust_i18n::available_locales!()
            .iter()
            .any(|available| available == value)
            .then(|| Self(value.to_string()))
    }

    /// 原始语言标签字符串。
    /// @returns 语言标签（如 "en"）
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Locale {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
