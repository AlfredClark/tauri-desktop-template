# AGENTS.md

## 项目概述

基于 **Tauri 2 + SvelteKit 5 + TypeScript** 的桌面应用开发模板。

- 前端为 SPA 模式（`src/routes/+layout.ts` 中 `ssr = false`，adapter-static 以 `index.html` 为 fallback），仅负责 UI
- 后端为 Rust，与前端通过 Tauri IPC（`invoke` / `#[tauri::command]`）通信
- 前端构建产物输出到 `build/`，由 Tauri 打包为桌面应用

## 技术栈与工具链

| 类别     | 选型                                                                        |
| -------- | --------------------------------------------------------------------------- |
| 包管理器 | bun（`bun.lock` 已提交，勿用 npm/yarn/pnpm）                                |
| 前端     | SvelteKit 5、Vite 8、TypeScript 6                                           |
| 桌面端   | Tauri 2.11、tauri-plugin-opener、@tauri-apps/api                            |
| Rust     | stable 工具链（`rust-toolchain.toml`），edition 2024                        |
| 环境要求 | Node >= 24（`package.json` engines），Linux 需 webkit2gtk 等 Tauri 系统依赖 |

## 目录结构

```
├── src/                        SvelteKit 前端
│   ├── app.html                入口 HTML（引用 /favicon.png）
│   └── routes/
│       ├── +layout.ts          全局布局（关闭 SSR）
│       └── +page.svelte        IPC 调用示例（invoke("greet")）
├── static/                     静态资源（favicon、logo）
├── src-tauri/                  桌面端（Rust）
│   ├── src/lib.rs              所有 #[tauri::command] 与 Builder 配置
│   ├── src/main.rs             二进制入口（调用 lib::run()）
│   ├── capabilities/default.json  窗口权限（main + core:default + opener:default）
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

## 约定与注意事项

- **新增 IPC 命令**：在 `src-tauri/src/lib.rs` 添加 `#[tauri::command]` 函数 → 注册到 `invoke_handler` → 前端用 `invoke()` 调用；如涉及新权限需同步修改 `capabilities/`
- **CSP**：`tauri.conf.json` 中 dev/prod 两套 CSP；prod 无 `unsafe-inline`，若前端需访问外部服务，必须同步更新 CSP 对应字段
- **端口**：dev 固定 1420（HMR websocket 1420/1421），与 vite.config.ts 及 CSP 一致，修改需三处同步
- **lib.rs 中 Linux Wayland 处理**（`WEBKIT_DISABLE_DMABUF_RENDERER`）为必要 workaround，勿删除
- **格式化规范**：prettier `printWidth: 128` 与 rustfmt `max_width: 128` 对齐；缩进 JS/JSON 2 空格、Rust/TOML 4 空格（.editorconfig）
- **Cargo profile**（Cargo.toml）：dev 主代码 `debug = "full"`，依赖 `opt-level = 1` + `line-tables-only`；release 为 `opt-level "s"` + fat LTO + `panic = "abort"` + `strip = "symbols"`（体积优先）
- **许可证**：GPL-3.0-only（package.json / Cargo.toml / LICENSE 三处一致）

## 对 Agent 的规则

1. 包管理一律使用 bun，不要手工编辑 `Cargo.lock` / `bun.lock`
2. 新依赖用 `bun add` / `cargo add` 添加（自动更新锁文件）
3. 改动完成后必须运行 `bun run validate`，全部通过才算完成
4. 不要修改生成目录：`build/`、`.svelte-kit/`、`target/`、`node_modules/`、`src-tauri/gen/`
5. 提交前注意 husky 钩子会自动运行 lint-staged 与 clippy
