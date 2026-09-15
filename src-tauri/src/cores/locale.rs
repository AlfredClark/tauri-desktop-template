use serde::{Deserialize, Serialize};
use specta::Type;

/// 应用支持的语言
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, Type)]
pub enum Locale {
    #[default]
    #[serde(rename = "en")]
    En,
    #[serde(rename = "zh-CN")]
    ZhCn,
}

impl Locale {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::En => "en",
            Self::ZhCn => "zh-CN",
        }
    }

    /// 容错解析 BCP-47 语言标签（`zh-Hans-CN`、`zh_CN`、`en-US` 等）
    pub fn parse(raw: &str) -> Self {
        let primary = raw.trim().split(['-', '_']).next().unwrap_or_default();
        if primary.eq_ignore_ascii_case("zh") {
            Self::ZhCn
        } else if primary.eq_ignore_ascii_case("en") {
            Self::En
        } else {
            Self::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_locale_tags() {
        let cases = [
            ("en", Locale::En),
            ("EN", Locale::En),
            ("en-US", Locale::En),
            ("zh", Locale::ZhCn),
            ("zh-CN", Locale::ZhCn),
            ("zh_CN", Locale::ZhCn),
            ("zh-Hans-CN", Locale::ZhCn),
            ("ZH-cn", Locale::ZhCn),
            ("  zh-CN  ", Locale::ZhCn),
        ];
        for (raw, expected) in cases {
            assert_eq!(
                Locale::parse(raw),
                expected,
                "unexpected result for {raw:?}"
            );
        }
    }

    #[test]
    fn falls_back_to_default() {
        assert_eq!(Locale::parse(""), Locale::En);
        assert_eq!(Locale::parse("fr"), Locale::En);
    }

    #[test]
    fn round_trips_through_as_str() {
        for locale in [Locale::En, Locale::ZhCn] {
            assert_eq!(Locale::parse(locale.as_str()), locale);
        }
    }
}
