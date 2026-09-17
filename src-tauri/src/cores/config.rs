use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Value};
use specta::Type;
use tauri::Runtime;
use tauri_plugin_store::{Store, StoreExt};

use crate::cores::locale::Locale;

/// 应用配置在 `tauri-plugin-store` 里的文件名（落在系统应用数据目录）
pub const STORE_FILE: &str = "config.json";
/// 配置结构版本在配置文件中的键名
const KEY_SCHEMA_VERSION: &str = "schema_version";
/// 界面语言在配置文件中的键名
const KEY_LOCALE: &str = "locale";
/// 开机自启在配置文件中的键名
const KEY_AUTO_START: &str = "auto_start";
/// 记住窗口状态在配置文件中的键名
const KEY_REMEMBER_WINDOW: &str = "remember_window";
/// 自动检查更新在配置文件中的键名
const KEY_AUTO_CHECK_UPDATE: &str = "auto_check_update";
/// 当前配置结构版本：变更字段语义时递增，并在迁移链中补对应升级步骤
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

/// 应用完整配置：各持久化项聚合于此，`store` 内仍按扁平键（`KEY_*`）逐项存储。
/// 新增字段必须能 `Default`（否则旧文件缺键会解析失败）；写路径统一走 `apply_patch` 逐键写入，
/// 禁止用陈旧的 `Config` 整体覆盖。
///
/// 新增一个配置项的固定步骤：
/// `KEY_*` 常量 → 本结构体加字段 → `ConfigPatch` 加同名 `Option` 字段 → `load_config` 回填
/// → 需要运行时副作用则加进 `apply_runtime_effects` → `reset_patch` 补默认值
/// → `cargo test` 重生成绑定。
///
/// 只有**改动已有字段的语义或位置**时才需要递增 `CURRENT_SCHEMA_VERSION` 并在 `MIGRATIONS`
/// 末尾补一级迁移，否则老用户配置会静默失效（纯新增字段由 `Default` + 容错读取兜住）。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(default)]
pub struct Config {
    /// 配置结构版本：旧文件缺键时回落 `0`，任何写入都会带上当前版本号
    #[serde(deserialize_with = "de_schema_version")]
    #[specta(type = u32)]
    pub schema_version: u32,
    /// 界面语言：缺失、类型不符或无法识别时回落默认值，绝不让整包解析失败
    #[serde(deserialize_with = "de_locale")]
    #[specta(type = Locale)]
    pub locale: Locale,
    /// 开机自启：缺失或类型不符时回落 `false`，绝不让整包解析失败
    #[serde(deserialize_with = "de_auto_start")]
    #[specta(type = bool)]
    pub auto_start: bool,
    /// 记住窗口状态：缺失或类型不符时回落 `false`，绝不让整包解析失败
    #[serde(deserialize_with = "de_remember_window")]
    #[specta(type = bool)]
    pub remember_window: bool,
    /// 自动检查更新：缺失或类型不符时回落 `false`，绝不让整包解析失败
    #[serde(deserialize_with = "de_auto_check_update")]
    #[specta(type = bool)]
    pub auto_check_update: bool,
}

/// 局部更新补丁：字段缺省或为 `null` 均表示"不改该键"，非 `null` 表示写入该值
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(default)]
pub struct ConfigPatch {
    /// 界面语言
    pub locale: Option<Locale>,
    /// 开机自启
    pub auto_start: Option<bool>,
    /// 记住窗口状态
    pub remember_window: Option<bool>,
    /// 自动检查更新
    pub auto_check_update: Option<bool>,
}

/// 容错解析界面语言：经 `serde_json::Value` 中转，非字符串或未知标签一律回落默认值
fn de_locale<'de, D>(deserializer: D) -> Result<Locale, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(value.as_str().map(Locale::parse).unwrap_or_default())
}

/// 容错解析开机自启：经 `serde_json::Value` 中转，非布尔值一律回落默认值（`false`）
fn de_auto_start<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(value.as_bool().unwrap_or_default())
}

/// 容错解析记住窗口状态：经 `serde_json::Value` 中转，非布尔值一律回落默认值（`false`）
fn de_remember_window<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(value.as_bool().unwrap_or_default())
}

/// 容错解析自动检查更新：经 `serde_json::Value` 中转，非布尔值一律回落默认值（`false`）
fn de_auto_check_update<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(value.as_bool().unwrap_or_default())
}

/// 容错解析结构版本：经 `parse_schema_version` 统一处理脏值
fn de_schema_version<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(parse_schema_version(Some(&value)))
}

/// 版本键原始值到 `u32` 的唯一转换口径：缺失、非无符号整数、超 `u32` 范围一律回落 `0`
fn parse_schema_version(value: Option<&Value>) -> u32 {
    value
        .and_then(Value::as_u64)
        .and_then(|raw| u32::try_from(raw).ok())
        .unwrap_or_default()
}

/// 启动装配：先把磁盘配置迁移到当前结构版本，再确定运行时语言、开机自启与窗口状态
pub fn setup(app: &tauri::App) {
    let handle = app.handle();
    migrate(handle);
    let locale = load_locale(handle).unwrap_or_else(|| {
        let detected = detect_locale();
        if let Err(err) = save_locale(handle, detected) {
            log::warn!("failed to persist detected locale: {err:#}");
        }
        detected
    });
    rust_i18n::set_locale(locale.as_str());
    // 开机自启以后端配置为权威，外部删改后重启自动修复；失败只记日志，不阻断启动
    if let Err(err) = sync_autostart(handle, load_config(handle).auto_start) {
        log::warn!("failed to enforce autostart state: {err:#}");
    }
    // 记住窗口开启时恢复上次几何；关闭时插件已跳过自动恢复，窗口按默认配置打开
    if load_config(handle).remember_window {
        restore_windows(handle);
    }
}

/// 按磁盘状态恢复全部窗口；单个失败只记日志，不阻断启动（仅桌面端有窗口状态依赖）
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn restore_windows(app: &tauri::AppHandle) {
    use tauri::Manager;
    use tauri_plugin_window_state::{StateFlags, WindowExt};

    for (label, window) in app.webview_windows() {
        if let Err(err) = window.restore_state(StateFlags::all()) {
            log::warn!("failed to restore window {label}: {err:#}");
        }
    }
}

/// 按磁盘状态恢复全部窗口；单个失败只记日志，不阻断启动（仅桌面端有窗口状态依赖）
#[cfg(any(target_os = "android", target_os = "ios"))]
fn restore_windows(_app: &tauri::AppHandle) {}

/// 读取完整应用配置；各字段缺失或无法识别时逐项回落默认值（无落盘副作用）
pub fn load_config(app: &tauri::AppHandle) -> Config {
    Config {
        locale: load_locale(app).unwrap_or_default(),
        auto_start: load_auto_start(app),
        remember_window: load_remember_window(app),
        auto_check_update: load_auto_check_update(app),
        schema_version: load_schema_version(app),
    }
}

/// 读取持久化的界面语言；未设置、类型不符或无法识别时返回 `None`
fn load_locale(app: &tauri::AppHandle) -> Option<Locale> {
    read_key(app, KEY_LOCALE)?.as_str().map(Locale::parse)
}

/// 读取持久化的开机自启；未设置或类型不符时回落默认值（`false`）
fn load_auto_start(app: &tauri::AppHandle) -> bool {
    read_key(app, KEY_AUTO_START)
        .and_then(|value| value.as_bool())
        .unwrap_or_default()
}

/// 读取持久化的记住窗口状态；未设置或类型不符时回落默认值（`false`）
fn load_remember_window(app: &tauri::AppHandle) -> bool {
    read_key(app, KEY_REMEMBER_WINDOW)
        .and_then(|value| value.as_bool())
        .unwrap_or_default()
}

/// 读取持久化的自动检查更新；未设置或类型不符时回落默认值（`false`）
fn load_auto_check_update(app: &tauri::AppHandle) -> bool {
    read_key(app, KEY_AUTO_CHECK_UPDATE)
        .and_then(|value| value.as_bool())
        .unwrap_or_default()
}

/// 读取持久化的配置结构版本；未设置或类型不符时回落 `0`
fn load_schema_version(app: &tauri::AppHandle) -> u32 {
    parse_schema_version(read_key(app, KEY_SCHEMA_VERSION).as_ref())
}

/// 应用局部更新并执行副作用，返回写后的最新配置。
/// 返回写后值是刻意的：前端据此回写内存态，无需再读一次，也就不会持陈旧值。
/// 开机自启先同步操作系统再落盘：失败时整条命令失败，盘与内存都不动。
pub fn update(app: &tauri::AppHandle, patch: &ConfigPatch) -> anyhow::Result<Config> {
    let before = load_config(app);
    if let Some(target) = wants_autostart_sync(patch, before.auto_start) {
        sync_autostart(app, target)?;
    }
    apply_patch(app, patch)?;
    let after = load_config(app);
    apply_runtime_effects(&before, &after);
    Ok(after)
}

/// 本次补丁是否要求变更操作系统自启状态；纯函数，便于单测决策分支
fn wants_autostart_sync(patch: &ConfigPatch, current: bool) -> Option<bool> {
    patch.auto_start.filter(|target| *target != current)
}

/// 把开机自启状态同步到操作系统；移动端无此依赖，直接视为成功
#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn sync_autostart(app: &tauri::AppHandle, enabled: bool) -> anyhow::Result<()> {
    use tauri_plugin_autostart::ManagerExt;

    let manager = app.autolaunch();
    if enabled {
        manager.enable()
    } else {
        manager.disable()
    }
    .map_err(|err| anyhow::anyhow!("failed to sync autostart to {enabled}: {err:#}"))?;
    Ok(())
}

/// 把开机自启状态同步到操作系统；移动端无此依赖，直接视为成功
#[cfg(any(target_os = "android", target_os = "ios"))]
fn sync_autostart(_app: &tauri::AppHandle, _enabled: bool) -> anyhow::Result<()> {
    Ok(())
}

/// 重置全部已知配置项为默认值；未知键保留（容错解析本就忽略它们，不做清理）
pub fn reset(app: &tauri::AppHandle) -> anyhow::Result<Config> {
    update(app, &reset_patch())
}

/// 重置所用的补丁：必须覆盖全部已知键，新增配置项时同步
/// （`reset_covers_every_known_key` 测试会拦截遗漏）
fn reset_patch() -> ConfigPatch {
    ConfigPatch {
        locale: Some(Locale::default()),
        auto_start: Some(false),
        remember_window: Some(false),
        auto_check_update: Some(false),
    }
}

/// 写入界面语言并立即落盘
fn save_locale(app: &tauri::AppHandle, locale: Locale) -> anyhow::Result<()> {
    apply_patch(
        app,
        &ConfigPatch {
            locale: Some(locale),
            ..ConfigPatch::default()
        },
    )
}

/// 写后副作用：仅对发生变化的字段生效，避免无谓的全局状态切换
fn apply_runtime_effects(before: &Config, after: &Config) {
    if needs_locale_apply(before, after) {
        rust_i18n::set_locale(after.locale.as_str());
    }
}

/// 语言是否需要重新应用到运行时
fn needs_locale_apply(before: &Config, after: &Config) -> bool {
    before.locale != after.locale
}

/// 逐键写入补丁：只写提交的键 + 版本号，不做整包覆盖
fn apply_patch(app: &tauri::AppHandle, patch: &ConfigPatch) -> anyhow::Result<()> {
    let store = app.store(STORE_FILE)?;
    for (key, value) in write_entries(patch) {
        store.set(key, value);
    }
    store.save()?;
    Ok(())
}

/// 补丁对应的待写键值对：**唯一的写入清单**，`apply_patch` 与测试共用
fn write_entries(patch: &ConfigPatch) -> Vec<(&'static str, Value)> {
    let mut entries = Vec::new();
    if let Some(locale) = patch.locale {
        entries.push((KEY_LOCALE, Value::from(locale.as_str())));
    }
    if let Some(auto_start) = patch.auto_start {
        entries.push((KEY_AUTO_START, Value::from(auto_start)));
    }
    if let Some(remember_window) = patch.remember_window {
        entries.push((KEY_REMEMBER_WINDOW, Value::from(remember_window)));
    }
    if let Some(auto_check_update) = patch.auto_check_update {
        entries.push((KEY_AUTO_CHECK_UPDATE, Value::from(auto_check_update)));
    }
    entries.push((KEY_SCHEMA_VERSION, Value::from(CURRENT_SCHEMA_VERSION)));
    entries
}

/// 读取某个键的原始值；打开配置文件失败时记日志并返回 `None`（读路径一律不阻断）
fn read_key(app: &tauri::AppHandle, key: &str) -> Option<Value> {
    let store = match app.store(STORE_FILE) {
        Ok(store) => store,
        Err(err) => {
            log::warn!("failed to open {STORE_FILE}: {err:#}");
            return None;
        }
    };
    store.get(key)
}

/// 配置迁移步骤：把快照从 `MIGRATIONS` 的索引版本升到索引 + 1，就地修改。
/// 纯函数、不依赖 Tauri 运行时，可脱离 store 单测；未识别键原样保留。
type Migration = fn(&mut Map<String, Value>);

/// 迁移链：索引即源版本号，长度必须等于 `CURRENT_SCHEMA_VERSION`
const MIGRATIONS: &[Migration] = &[migrate_v0_to_v1];

/// v0 → v1：引入结构版本键，并把早期写坏的 `locale` 就地规整为合法标签，
/// 使磁盘值与运行时读取语义一致（读取侧本就经 `Locale::parse` 容错）
fn migrate_v0_to_v1(map: &mut Map<String, Value>) {
    if let Some(raw) = map.get(KEY_LOCALE).and_then(Value::as_str) {
        map.insert(
            KEY_LOCALE.to_owned(),
            Value::from(Locale::parse(raw).as_str()),
        );
    }
}

/// 读取快照里的结构版本；缺失或脏值一律视为 `0`
fn schema_version_of(map: &Map<String, Value>) -> u32 {
    parse_schema_version(map.get(KEY_SCHEMA_VERSION))
}

/// 把快照升到当前版本；返回是否需要写回磁盘
fn migrate_snapshot(map: &mut Map<String, Value>) -> bool {
    if map.is_empty() {
        // 全新安装没有存量可迁移；首次真实写入自会带上版本号
        return false;
    }

    let from = schema_version_of(map);
    log::debug!("config schema v{from}, supported v{CURRENT_SCHEMA_VERSION}");
    if from > CURRENT_SCHEMA_VERSION {
        log::warn!(
            "config schema v{from} is newer than supported v{CURRENT_SCHEMA_VERSION}, leaving it untouched"
        );
        return false;
    }
    if from == CURRENT_SCHEMA_VERSION {
        return false;
    }

    for migration in MIGRATIONS.iter().skip(from as usize) {
        migration(map);
    }
    map.insert(
        KEY_SCHEMA_VERSION.to_owned(),
        Value::from(CURRENT_SCHEMA_VERSION),
    );
    true
}

/// 启动迁移：把磁盘上的配置升到当前结构版本。
///
/// **必须在任何写入之前调用**——首次落库会直接写上当前版本号，跑在迁移之后就再也升不上来。
pub fn migrate(app: &tauri::AppHandle) {
    let store = match app.store(STORE_FILE) {
        Ok(store) => store,
        Err(err) => {
            log::warn!("failed to open {STORE_FILE}: {err:#}");
            return;
        }
    };

    let before: Map<String, Value> = store.entries().into_iter().collect();
    let mut after = before.clone();
    if !migrate_snapshot(&mut after) {
        return;
    }

    log::info!("migrating {STORE_FILE} to schema v{CURRENT_SCHEMA_VERSION}");
    if let Err(err) = persist_diff(&store, &before, &after) {
        log::warn!("failed to persist migrated config: {err:#}");
    }
}

/// 只写回迁移改动过的键、删除被移除的键，未触碰的未知键保持原样
fn persist_diff<R: Runtime>(
    store: &Store<R>,
    before: &Map<String, Value>,
    after: &Map<String, Value>,
) -> anyhow::Result<()> {
    let mut changed = false;
    for (key, value) in after {
        if before.get(key) != Some(value) {
            store.set(key.clone(), value.clone());
            changed = true;
        }
    }
    for key in before.keys() {
        if !after.contains_key(key) {
            store.delete(key);
            changed = true;
        }
    }
    if changed {
        store.save()?;
    }
    Ok(())
}

/// 探测操作系统语言（BCP-47），失败或无法识别时回落默认语言
fn detect_locale() -> Locale {
    tauri_plugin_os::locale().map_or_else(Locale::default, |raw| Locale::parse(&raw))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// 取键值对清单里的键，便于断言写入覆盖面
    fn keys_of(entries: &[(&'static str, Value)]) -> Vec<&'static str> {
        entries.iter().map(|(key, _)| *key).collect()
    }

    #[test]
    fn defaults_to_english() {
        let config = Config::default();
        assert_eq!(config.locale, Locale::En);
        assert!(!config.auto_start);
        assert!(!config.remember_window);
        assert!(!config.auto_check_update);
        assert_eq!(config.schema_version, 0);
    }

    #[test]
    fn round_trips_through_json() {
        let config = Config {
            locale: Locale::ZhCn,
            auto_start: true,
            remember_window: true,
            auto_check_update: true,
            schema_version: CURRENT_SCHEMA_VERSION,
        };
        let raw = serde_json::to_value(&config).expect("config serializes");
        assert_eq!(
            raw,
            json!({ "locale": "zh-CN", "auto_start": true, "remember_window": true, "auto_check_update": true, "schema_version": 1 })
        );
        let back: Config = serde_json::from_value(raw).expect("config deserializes");
        assert_eq!(back, config);
    }

    #[test]
    fn tolerates_missing_or_unrecognized_locale() {
        for raw in [
            json!({}),
            json!({ "locale": "fr" }),
            json!({ "locale": 5 }),
            json!({ "locale": null }),
        ] {
            let config: Config = serde_json::from_value(raw).expect("never fails");
            assert_eq!(config.locale, Locale::En);
        }
    }

    #[test]
    fn tolerates_missing_or_invalid_auto_start() {
        for (raw, expected) in [
            (json!({}), false),
            (json!({ "auto_start": true }), true),
            (json!({ "auto_start": "yes" }), false),
            (json!({ "auto_start": 1 }), false),
            (json!({ "auto_start": null }), false),
        ] {
            let config: Config = serde_json::from_value(raw).expect("never fails");
            assert_eq!(config.auto_start, expected);
        }
    }

    #[test]
    fn tolerates_missing_or_invalid_remember_window() {
        for (raw, expected) in [
            (json!({}), false),
            (json!({ "remember_window": true }), true),
            (json!({ "remember_window": "yes" }), false),
            (json!({ "remember_window": 1 }), false),
            (json!({ "remember_window": null }), false),
        ] {
            let config: Config = serde_json::from_value(raw).expect("never fails");
            assert_eq!(config.remember_window, expected);
        }
    }

    #[test]
    fn tolerates_missing_or_invalid_auto_check_update() {
        for (raw, expected) in [
            (json!({}), false),
            (json!({ "auto_check_update": true }), true),
            (json!({ "auto_check_update": "yes" }), false),
            (json!({ "auto_check_update": 1 }), false),
            (json!({ "auto_check_update": null }), false),
        ] {
            let config: Config = serde_json::from_value(raw).expect("never fails");
            assert_eq!(config.auto_check_update, expected);
        }
    }

    #[test]
    fn tolerates_missing_or_unrecognized_schema_version() {
        for (raw, expected) in [
            (json!({}), 0_u32),
            (json!({ "schema_version": 1 }), 1),
            (json!({ "schema_version": "x" }), 0),
            (json!({ "schema_version": -1 }), 0),
            (json!({ "schema_version": null }), 0),
            (json!({ "schema_version": 5_000_000_000_u64 }), 0),
        ] {
            let config: Config = serde_json::from_value(raw).expect("never fails");
            assert_eq!(config.schema_version, expected);
        }
    }

    #[test]
    fn ignores_unknown_keys() {
        let config: Config = serde_json::from_value(json!({ "locale": "en", "theme": "dark" }))
            .expect("unknown keys ignored");
        assert_eq!(config.locale, Locale::En);
    }

    #[test]
    fn patch_treats_absent_and_null_as_no_change() {
        let absent: ConfigPatch = serde_json::from_value(json!({})).expect("patch deserializes");
        assert_eq!(absent.locale, None);
        assert_eq!(absent.auto_start, None);
        assert_eq!(absent.remember_window, None);
        assert_eq!(absent.auto_check_update, None);

        let cleared: ConfigPatch =
            serde_json::from_value(json!({ "locale": null })).expect("null tolerated");
        assert_eq!(cleared.locale, None);

        let set: ConfigPatch =
            serde_json::from_value(json!({ "locale": "zh-CN" })).expect("locale parsed");
        assert_eq!(set.locale, Some(Locale::ZhCn));

        let toggled: ConfigPatch =
            serde_json::from_value(json!({ "auto_start": true })).expect("flag parsed");
        assert_eq!(toggled.auto_start, Some(true));

        let remembered: ConfigPatch =
            serde_json::from_value(json!({ "remember_window": true })).expect("flag parsed");
        assert_eq!(remembered.remember_window, Some(true));

        let auto_checked: ConfigPatch =
            serde_json::from_value(json!({ "auto_check_update": true })).expect("flag parsed");
        assert_eq!(auto_checked.auto_check_update, Some(true));
    }

    #[test]
    fn patch_writes_only_submitted_keys() {
        let untouched = write_entries(&ConfigPatch::default());
        assert_eq!(
            keys_of(&untouched),
            vec![KEY_SCHEMA_VERSION],
            "未提交的键不得写入"
        );

        let patched = write_entries(&ConfigPatch {
            locale: Some(Locale::ZhCn),
            auto_start: Some(true),
            remember_window: Some(true),
            auto_check_update: Some(true),
        });
        assert_eq!(
            keys_of(&patched),
            vec![
                KEY_LOCALE,
                KEY_AUTO_START,
                KEY_REMEMBER_WINDOW,
                KEY_AUTO_CHECK_UPDATE,
                KEY_SCHEMA_VERSION
            ]
        );
        assert_eq!(patched[0].1, json!("zh-CN"));
        assert_eq!(patched[1].1, json!(true));
        assert_eq!(patched[2].1, json!(true));
        assert_eq!(patched[3].1, json!(true));
    }

    #[test]
    fn reset_covers_every_known_key() {
        let entries = write_entries(&reset_patch());
        assert_eq!(
            keys_of(&entries),
            vec![
                KEY_LOCALE,
                KEY_AUTO_START,
                KEY_REMEMBER_WINDOW,
                KEY_AUTO_CHECK_UPDATE,
                KEY_SCHEMA_VERSION
            ],
            "新增配置项时必须同步 reset_patch"
        );
        assert_eq!(entries[0].1, json!(Locale::default().as_str()));
        assert_eq!(entries[1].1, json!(false));
        assert_eq!(entries[2].1, json!(false));
        assert_eq!(entries[3].1, json!(false));
    }

    #[test]
    fn locale_side_effect_triggers_only_on_change() {
        let base = Config {
            locale: Locale::En,
            auto_start: false,
            remember_window: false,
            auto_check_update: false,
            schema_version: CURRENT_SCHEMA_VERSION,
        };
        assert!(!needs_locale_apply(&base, &base));

        let switched = Config {
            locale: Locale::ZhCn,
            ..Config::default()
        };
        assert!(needs_locale_apply(&base, &switched));
    }

    #[test]
    fn autostart_sync_triggers_only_on_change() {
        let off = ConfigPatch {
            auto_start: Some(false),
            ..ConfigPatch::default()
        };
        assert_eq!(wants_autostart_sync(&off, false), None);

        let on = ConfigPatch {
            auto_start: Some(true),
            ..ConfigPatch::default()
        };
        assert_eq!(wants_autostart_sync(&on, false), Some(true));
        assert_eq!(wants_autostart_sync(&on, true), None);

        assert_eq!(wants_autostart_sync(&ConfigPatch::default(), false), None);
    }

    /// 把 JSON fixture 转成迁移链使用的快照
    fn snapshot(raw: &Value) -> Map<String, Value> {
        raw.as_object().cloned().expect("fixture is an object")
    }

    #[test]
    fn migration_chain_matches_current_version() {
        assert_eq!(
            MIGRATIONS.len(),
            CURRENT_SCHEMA_VERSION as usize,
            "每次递增 CURRENT_SCHEMA_VERSION 必须补一级迁移"
        );
    }

    #[test]
    fn migrates_legacy_snapshot_without_losing_unknown_keys() {
        let mut map = snapshot(&json!({ "locale": "zh_Hans_CN", "theme": "dark" }));

        assert!(migrate_snapshot(&mut map));

        assert_eq!(map.get(KEY_LOCALE).and_then(Value::as_str), Some("zh-CN"));
        assert_eq!(schema_version_of(&map), CURRENT_SCHEMA_VERSION);
        assert_eq!(
            map.get("theme").and_then(Value::as_str),
            Some("dark"),
            "未知键不得丢失"
        );
    }

    #[test]
    fn migrates_unrecognized_locale_to_default() {
        let mut map = snapshot(&json!({ "locale": "fr" }));

        assert!(migrate_snapshot(&mut map));

        assert_eq!(map.get(KEY_LOCALE).and_then(Value::as_str), Some("en"));
    }

    #[test]
    fn snapshot_at_current_version_needs_no_write() {
        let mut map =
            snapshot(&json!({ "locale": "en", "schema_version": CURRENT_SCHEMA_VERSION }));
        let original = map.clone();

        assert!(!migrate_snapshot(&mut map));
        assert_eq!(map, original);
    }

    #[test]
    fn snapshot_from_newer_version_is_left_untouched() {
        let mut map = snapshot(&json!({
            "locale": "en",
            "schema_version": CURRENT_SCHEMA_VERSION + 7
        }));
        let original = map.clone();

        assert!(!migrate_snapshot(&mut map), "降级运行不得回写配置");
        assert_eq!(map, original);
    }

    #[test]
    fn empty_snapshot_needs_no_write() {
        let mut map: Map<String, Value> = Map::new();

        assert!(!migrate_snapshot(&mut map), "全新安装不写入");
        assert!(map.is_empty());
    }

    #[test]
    fn dirty_version_key_is_treated_as_legacy() {
        let mut map = snapshot(&json!({ "locale": "zh-CN", "schema_version": "x" }));

        assert!(migrate_snapshot(&mut map));

        assert_eq!(schema_version_of(&map), CURRENT_SCHEMA_VERSION);
    }
}
