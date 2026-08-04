# AGENTS.md

## 项目概述

基于 **Tauri 2 + SvelteKit 5 + TypeScript** 的桌面应用开发模板。

- 前端为 SPA 模式（`src/routes/+layout.ts` 中 `ssr = false`，adapter-static 以 `index.html` 为 fallback），仅负责 UI
- 后端为 Rust，与前端通过 Tauri IPC（`invoke` / `#[tauri::command]`）通信
- 前端构建产物输出到 `build/`，由 Tauri 打包为桌面应用

## 技术栈与工具链

| 类别     | 选型                                                                                                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 包管理器 | bun（`bun.lock` 已提交，勿用 npm/yarn/pnpm）                                                                                                                                                                                                       |
| 前端     | SvelteKit 5、Vite 8、TypeScript 6                                                                                                                                                                                                                  |
| 桌面端   | Tauri 2.11、tauri-plugin-opener、tauri-plugin-store（config.json）、tauri-plugin-autostart、tauri-plugin-log（前后端共用日志）、tauri-plugin-single-instance（单实例）、系统托盘（tauri 内置 tray-icon）、@tauri-apps/api、rust-i18n（后端国际化） |
| Rust     | stable 工具链（`rust-toolchain.toml`），edition 2024                                                                                                                                                                                               |
| 环境要求 | Node >= 24（`package.json` engines），Linux 需 webkit2gtk 等 Tauri 系统依赖                                                                                                                                                                        |

## 目录结构

```
├── src/                        SvelteKit 前端
│   ├── app.html                入口 HTML（引用 /favicon.png）
│   ├── components/             自定义 Svelte 组件（按功能分子目录）
│   ├── lib/                    前端功能模块
│   │   ├── i18n/               国际化（paraglide-js 配置 / 消息源 / 生成产物 / 模块）
│   │   ├── ipc/                IPC 封装（invokeCommand 统一响应解包）
│   │   ├── logger/             日志模块（tauri-plugin-log 前端封装，与后端共用链路）
│   │   └── stores/             状态管理模块（types.ts / utils.ts / index.ts）
│   └── routes/                 页面路由
│       ├── +layout.ts          全局布局（关闭 SSR、启动同步 locale）
│       ├── +layout.svelte      html lang 属性客户端同步（app.html 硬编码 en）
│       └── +page.svelte        IPC 调用示例（invoke("greet")、日志与托盘开关演示）
├── static/                     静态资源（favicon、logo）
├── src-tauri/                  桌面端（Rust）
│   ├── src/lib.rs              模块组装：Builder / setup / 命令注册 / rust-i18n 初始化
│   ├── src/cores/              核心逻辑（含初始化 setup、自动启动 autostart.rs、Linux 环境准备 env.rs、日志装配 logger.rs、统一响应协议 response.rs、locale 类型 locale.rs、单实例 instance.rs、系统托盘 tray.rs）
│   ├── src/commands/           IPC 命令薄层（如 config.rs，含 get_config / set_locale / toggle_autostart / toggle_tray）
│   ├── locales/                后端消息源（rust-i18n，en.yml / zh-CN.yml）
│   ├── src/main.rs             二进制入口（调用 lib::run()）
│   ├── capabilities/default.json  窗口权限（main + core:default + opener:default + log:default）
│   ├── tauri.conf.json         窗口 / CSP / 打包配置
│   ├── build.rs                tauri-build 构建脚本
│   └── icons/                  应用图标（勿删）
├── Cargo.toml                  workspace 根（profile、lints）
├── package.json                scripts、lint-staged、engines
├── svelte.config.ts            adapter-static 配置
├── vite.config.ts              dev server 端口 1420
├── eslint.config.ts / .stylelintrc.json / .prettierrc / rustfmt.toml   代码规范
├── .husky/pre-commit           lint-staged + cargo clippy 提交钩子
└── rust-toolchain.toml         固定 stable 工具链
```

## 常用命令（统一用 `bun run`）

| 命令                                | 说明                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `bun run tauri:dev`                 | 启动桌面应用开发（自动拉起 vite dev）                     |
| `bun run tauri:build`               | 打包发布版本                                              |
| `bun run dev` / `build` / `preview` | 纯前端开发 / 构建 / 预览                                  |
| `bun run check`                     | svelte-check 类型检查                                     |
| `bun run check:rust`                | cargo check                                               |
| `bun run lint:all`                  | eslint + stylelint + `cargo clippy -D warnings`           |
| `bun run format:all:check`          | prettier --check + cargo fmt --check                      |
| `bun run validate`                  | 完整验证：lint + 格式 + Rust + 类型检查（改动后必须通过） |

## 前端模块

前端功能按模块组织在 `src/lib/` 下，每个模块由类型契约、实现与统一出口三部分构成（详见各模块小节）。

### 状态管理（stores）

位于 `src/lib/stores/`：基于 Svelte `writable` 的增强型 store 工厂。

| 文件       | 职责                                                                              |
| ---------- | --------------------------------------------------------------------------------- |
| `types.ts` | 类型契约：`StorageType` 枚举、`StorageAdapter`、`PersistOptions`、`Store<T>` 接口 |
| `utils.ts` | `createStore` 工厂实现（含 local/session 适配器）                                 |
| `index.ts` | 统一出口：重导出工厂与类型，并集中实例化业务 store                                |

#### 创建 store

```ts
import { createStore } from "$lib/stores";

// 纯内存 store
const count = createStore<number>(0);

// 持久化：字符串简写，key 为 "theme"，介质默认 Local
const theme = createStore("light", { persist: "theme" });

// 持久化：完整对象配置（指定介质）
const status = createStore(() => ({ splashscreen: true }), {
  persist: { key: "status", storage: StorageType.Session },
});

// 值变更回调（与持久化相互独立，无绑定关系）
const countWithLog = createStore<number>(0, {
  subscribe: (value) => console.log("count:", value),
});
```

- `initial` 支持字面量或惰性函数（惰性函数在创建时执行一次）
- `persist` 为字符串时视为 key（介质默认 `Local`）；为对象时可指定 `key` 与 `storage`（`StorageType.Local` / `StorageType.Session`）
- `subscribe` 为值变更回调，注册为内部订阅者：创建时执行一次，此后每次 `set`/`update`/`reset` 后触发，接收新值

#### 使用 store

- 组件内用 `$store` 语法自动订阅（`{$store}` 读取）；`$store = value` 等价 `store.set(value)`（需整体赋值）
- `store.set(value)` / `store.update(fn)` / `store.get()` / `store.reset()`
- 对象型 store 的字段级 input 绑定无法使用 `bind:value={$store.field}`（Svelte 不支持 store 成员表达式绑定），需用 `value={$store.field}` + `oninput` + `update()` 组合，或采用「父组件订阅 + props 切片」模式
- 修改对象型 store 单项字段：`store.update((s) => ({ ...s, field: newValue }))`；通知所有订阅者是预期的（DOM 更新仍细粒度），设置项多时用 props 切片收窄子组件重跑

#### 持久化行为

- 创建时从存储读取数据（hydrate）；条目缺失或 JSON 损坏时静默回退初始值
- 首次创建且条目缺失时立即写入默认值，保证存储与内存一致
- `set`/`update` 同步写入，写入失败（配额满、隐私模式等）静默忽略，不影响内存状态
- `reset()`：删除存储条目 → 内存恢复默认值 → 写回默认值（存储条目始终存在）

#### 新增业务 store 的约定

- 值类型定义在 `types.ts`，实例化在 `index.ts` 并统一导出
- 命名不带 store 后缀（如 `settings`、`status`）
- 异步/复杂业务逻辑（如 Tauri IPC 调用）不放入工厂，由具体业务 store 自行实现

> 其他模块（如主题切换等）后续按此结构补充。

### IPC 封装（ipc）

位于 `src/lib/ipc/`：统一响应协议的封装，所有 Rust 命令调用统一走 `invokeCommand`。

| 文件       | 职责                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `types.ts` | 类型契约：`Response<T>` 接口、`CODE_OK` 常量（与 Rust `cores/response.rs` 对齐） |
| `utils.ts` | `invokeCommand` 实现：invoke 调用 + 解包响应，失败 console.error 并返回 null     |
| `index.ts` | 统一出口                                                                         |

```ts
import { invokeCommand } from "$lib/ipc";

const locale = await invokeCommand<string>("get_config", { key: "locale" });
```

- 成功时返回业务数据（`T`）；失败（code !== 0）时 console.error 打印并返回 null，调用方用 `??` 兜底
- 命令参数键名与 Rust 参数名一致（Tauri 自动转换驼峰命名）

### 日志（log）

位于 `src/lib/logger/`：tauri-plugin-log 的前端封装，与后端（log crate 宏）共用同一日志链路。

| 文件       | 职责                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `utils.ts` | `initLogger`：挂载 `attachConsole`（插件日志镜像到浏览器控制台），应用启动时调用一次            |
| `index.ts` | 统一出口：重导出 `trace` / `debug` / `info` / `warn` / `error` / `attachConsole` + `initLogger` |

```ts
import { initLogger, info, error } from "$lib/logger";

await initLogger(); // 挂载于 +layout.svelte 的 onMount
info("message"); // 写入日志：浏览器控制台（attachConsole）+ LogDir 文件
```

- 无自有类型契约（插件自带完整类型），故省略 `types.ts`
- 组件内直接 `import { info } from "$lib/logger"` 使用；后端 Rust 侧对应 `log::info!` 等宏
- 非 Tauri 环境（纯前端 dev）下 `initLogger` 静默失败，不影响应用

### 国际化（i18n）

位于 `src/lib/i18n/`：基于 paraglide-js 的国际化，配置、消息源与生成产物统一收拢于此。

| 文件/目录                      | 职责                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `project.inlang/settings.json` | inlang 项目配置（baseLocale: en、locales: en/zh-CN、消息格式插件）                                                              |
| `messages/{en,zh-CN}.json`     | 消息源文件，新增文案需双语同步                                                                                                  |
| `paraglide/`                   | 生成产物（已 gitignore——目录内 `.gitignore` 为 `*`，由 vite 插件自动编译；IDE 类型提示依赖其存在，已加入 eslint/prettier 忽略） |
| `utils.ts`                     | `changeLocale`（后端优先的语言切换）+ `syncLocale`（启动时从后端同步 locale）                                                   |
| `index.ts`                     | 统一出口：`changeLocale` / `syncLocale` + 重导出 paraglide 运行时 `getLocale` / `isLocale` / `toLocale` 与类型                  |

```ts
import { changeLocale, syncLocale } from "$lib/i18n";
import { m } from "$lib/i18n/paraglide/messages";
import { ParaglideMessage } from "@inlang/paraglide-js-svelte";

await syncLocale(); // 启动时调用（+layout.ts 的 load 中，页面渲染前）：从后端同步 locale
const ok = await changeLocale("zh-CN"); // 切换语言：先写 Rust config.json 落盘，成功后才切 paraglide 运行时
// 组件内：{m.xxx()} 响应切换，富文本用 <ParaglideMessage message={m.xxx} />
```

- locale 真相源为 Rust 侧 `config.json`（系统级配置），前端运行时与后端 rust-i18n 均为其镜像（见「后端国际化」小节）
- `changeLocale` 后端优先：先 `set_locale` 写 config.json 落盘，成功后才调用 paraglide 运行时 `setLocale(locale, { reload })`；`reload` 默认 true（刷新页面从持久化恢复），纯内存切换传 `false`（避免刷新循环）；vite 插件 `strategy: ["globalVariable", "baseLocale"]`（纯内存，禁止 paraglide 自行持久化），config.json 为唯一真相源
- 启动同步：`syncLocale` 读取 config.json 的 locale 并经 `toLocale` 校验后 `setLocale(locale, { reload: false })` 应用，挂载于 `src/routes/+layout.ts` 的 `load`（SPA 下页面渲染前执行一次，首帧即正确语言）；命令失败（含 IPC 异常）或条目缺失时静默保持 paraglide 默认语言
- 运行时读取/校验直接使用 paraglide 重导出：`getLocale()` / `isLocale()` / `toLocale()`（从 `$lib/i18n` 导入）
- `<html lang>` 语义：`app.html` 硬编码 `lang="en"`；SPA 无服务端 hooks（无法用官方 `%lang%` + `hooks.server.ts` 方案），由 `src/routes/+layout.svelte` 的 `onMount` 以 `document.documentElement.lang = getLocale()` 客户端同步（layout load 先执行 `syncLocale`，挂载时语言已正确；`changeLocale` 默认 reload 后重挂载生效）
- 新增文案：`messages/en.json` 与 `messages/zh-CN.json` 双语同步添加
- 新增语言：修改 `project.inlang/settings.json` 的 `locales`（paraglide `Locale` 类型自动派生）；改动配置后需重新编译生成产物（`bun run paraglide:compile`，参数与 vite 插件保持一致）

## 后端国际化（rust-i18n）

基于 rust-i18n v4（编译期 codegen，YAML 消息源），与前端 i18n 共用 config.json 的 `locale` 作为真相源。

| 文件/目录            | 职责                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| `src-tauri/locales/` | 消息源（`_version: 1`，en.yml / zh-CN.yml，双语同步）                 |
| `src/lib.rs`         | `rust_i18n::i18n!("locales", fallback = "en")` 初始化                 |
| `cores/locale.rs`    | `Locale` newtype：经 `available_locales!` 校验，杜绝非法 locale 值    |
| `cores/config.rs`    | setup 加载 config.json 后 `rust_i18n::set_locale` 同步初始值          |
| `commands/config.rs` | `set_locale` 写 locale 前经 `Locale` 校验，非法值拒绝写入并同步运行时 |

```rust
use rust_i18n::t;
// 消息源（src-tauri/locales/en.yml）：greet: "Hello, %{name}!"
Response::ok(t!("greet", name = name).to_string())
```

- 默认 locale 为 `"en"`（与前端 paraglide `baseLocale` 一致），缺失翻译回退 en
- locale 值约束：`Locale::new` 校验（可用语言列表编译期固定）；`Config::load` 遇到缺失/非法值回退默认并落盘修复；`set_locale` 对非法 locale 直接返回错误码拒绝写入（不落盘）
- locale 切换链路：前端 `changeLocale` → `set_locale`（校验 + config.json 落盘）→ `rust_i18n::set_locale`，后端 `t!` 随即返回新语言文本
- 业务返回值（如 `greet`）用 `t!` 本地化；错误信息（`Response.message`）不本地化，保留技术原文
- 托盘菜单文案（`cores/tray.rs` 的 `t!("tray.*")`）同样经 `t!` 本地化，`set_locale` 时经 `rebuild_menu` 重建菜单
- 新增文案：`en.yml` 与 `zh-CN.yml` 双语同步添加（`_version: 1`，key 支持嵌套 map 与 `%{name}` 插值）
- 新增语言：新建 `locales/<locale>.yml`，并同步前端 `settings.json` 的 `locales`（paraglide `Locale` 类型自动派生）

## 约定与注意事项

- **前端模块结构**：每个前端模块位于 `src/lib/<模块名>/`，遵循「类型契约 → 实现 → 统一出口」三段式：
  - `types.ts`：类型契约（接口/枚举/类型），与实现解耦
  - 实现文件（如 `utils.ts`）：核心逻辑，按职责拆分
  - `index.ts`：统一出口——重导出模块公开 API，并集中实例化业务实例（如 store）
  - 消费方统一从 `$lib/<模块名>` 导入，禁止跨模块内部文件引用
  - 新增模块时，同步在 AGENTS.md「前端模块」章节添加对应小节（文件职责表 + 用法 + 约定），「目录结构」添加模块目录及说明
- **新增 IPC 命令**：命令定义在 `src-tauri/src/commands/<模块>.rs`（薄层，核心逻辑经 `State` 注入或调用 `cores/` 模块，统一返回 `cores/response.rs` 的 `Response<T>`，错误码 0 成功 / 1 内部错误）→ 在 `commands/mod.rs` 的 `invoke_handlers!` 宏中追加（`lib.rs` 的 `invoke_handler` 无需改动）→ 前端经 `invokeCommand` 调用；如涉及新权限需同步修改 `capabilities/`
- **系统级配置**：`config.json`（应用数据目录，tauri-plugin-store）经 `cores/config.rs` 的 `setup` 初始化并存入 Tauri State（避免重复读文件），读取统一走 `get_config`（键值通用读，条目缺失返回 null，前端 `??` 兜底），写入按配置项专项专用：`set_locale` 写 locale（校验 + 同步 rust-i18n 运行时 + 重建托盘菜单）、`toggle_autostart` 切换 autostart、`toggle_tray` 切换系统托盘，无需新增 capabilities 权限；`locale` 为前后端 i18n 共用的真相源（前端 `changeLocale` 写回同步，后端 rust-i18n 运行时经 `set_locale` 钩子同步，见「后端国际化」小节）；`autostart`（开机自启）同样以 config.json 为真相源：插件装配于 `cores/autostart.rs`（插件链仅一行 `.plugin(cores::autostart::plugin())`），启动时按持久化值 apply 到 OS，切换必须走 `toggle_autostart` 命令（先 OS 生效再写回 config，防双写路径不一致）；`tray`（系统托盘）同样以 config.json 为真相源（默认开启）：`cores/tray.rs` 启动时无条件创建托盘一次并按持久化值设置显隐（左键切换窗口显隐、右键弹菜单：显示/隐藏 + 退出），切换必须走 `toggle_tray` 命令（先 `set_visible` 显隐再写回 config）；注意托盘显隐用 `set_visible` 而非移除/重建——Linux 下 remove/recreate 会因 libappindicator 不注销 D-Bus 对象导致路径注册冲突、无法重新显示（上游限制）；菜单文案经 rust-i18n `t!` 本地化，`set_locale` 时经 `rebuild_menu` 重建菜单；系统级配置与前端 UI 偏好（localStorage stores 模块）按配置归属分层，不混用
- **单实例**：装配于 `cores/instance.rs`（插件链仅一行 `.plugin(cores::instance::plugin())`，置于链首）；Linux 下首个实例注册 D-Bus 名 `{identifier}.SingleInstance`，第二实例启动时回调于首个实例进程内执行（仅聚焦主窗口：取消最小化 + 显示 + 聚焦）后自行退出；纯 Rust 侧，无 capabilities 权限
- **日志**：前后端共用 tauri-plugin-log（Rust 侧 `log::info!` 等宏，前端 `$lib/logger` 封装，前端命令需 `log:default` 权限）；装配于 `cores/logger.rs`（插件链仅一行 `.plugin(cores::logger::plugin())`）：dev Trace / release Info，stdout + LogDir（Linux `~/.local/share/{bundleIdentifier}/logs/`）+ Webview 目标，1MB KeepAll 轮转、本地时区；`attachConsole` 经 `initLogger` 挂载于 `+layout.svelte` 的 onMount（前端日志镜像到浏览器控制台）
- **CSP**：`tauri.conf.json` 中 dev/prod 两套 CSP；prod 无 `unsafe-inline`，若前端需访问外部服务，必须同步更新 CSP 对应字段
- **端口**：dev 固定 1420（HMR websocket 1420/1421），与 vite.config.ts 及 CSP 一致，修改需三处同步
- **cores/env.rs 中 Linux Wayland 处理**（`init_env` 设置 `WEBKIT_DISABLE_DMABUF_RENDERER`）为必要 workaround，勿删除；需在 Builder 创建前调用
- **格式化规范**：prettier `printWidth: 128` 与 rustfmt `max_width: 128` 对齐；缩进 JS/JSON 2 空格、Rust/TOML 4 空格（.editorconfig）
- **Cargo profile**（Cargo.toml）：dev 主代码 `debug = "full"`，依赖 `opt-level = 1` + `line-tables-only`；release 为 `opt-level "s"` + fat LTO + `panic = "abort"` + `strip = "symbols"`（体积优先）
- **许可证**：GPL-3.0-only（package.json / Cargo.toml / LICENSE 三处一致）

## 对 Agent 的规则

1. 包管理一律使用 bun，不要手工编辑 `Cargo.lock` / `bun.lock`
2. 新依赖用 `bun add` / `cargo add` 添加（自动更新锁文件）
3. 改动完成后必须运行 `bun run validate`，全部通过才算完成
4. 不要修改生成目录：`build/`、`.svelte-kit/`、`target/`、`node_modules/`、`src-tauri/gen/`
5. 提交前注意 husky 钩子会自动运行 lint-staged 与 clippy
